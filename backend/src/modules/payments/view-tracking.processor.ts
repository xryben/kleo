import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma.service';
import { ViewFetchService } from './view-fetch.service';
import { PLATFORM_FEE_PERCENT, PAYOUT_HOLD_HOURS } from '../../config/app.config';

interface ClaimAggregation {
  claimId: string;
  clipperId: string;
  campaignId: string;
  cpmCents: number;
  totalViews: number;
  previousTotalViews: number;
  submissions: {
    id: string;
    viewCount: number;
    previousViewCount: number;
    flagged: boolean;
    flagReason: string | null;
  }[];
}

@Processor('view-tracking')
export class ViewTrackingProcessor {
  private readonly logger = new Logger(ViewTrackingProcessor.name);

  constructor(
    private prisma: PrismaService,
    private viewFetch: ViewFetchService,
  ) {}

  @Process('track-views')
  async handleTrackViews(job: Job) {
    this.logger.log('Starting view tracking job...');

    const platformFee = PLATFORM_FEE_PERCENT / 100;

    // Get all claims that have at least one verified submission on active campaigns
    const claims = await this.prisma.clipClaim.findMany({
      where: {
        status: 'VERIFIED',
        campaignClip: { campaign: { status: 'ACTIVE' } },
      },
      include: {
        submissions: {
          where: { verifiedAt: { not: null } },
          include: {
            snapshots: { orderBy: { checkedAt: 'desc' }, take: 5 },
          },
        },
        campaignClip: {
          include: {
            campaign: {
              select: { id: true, cpmCents: true, budgetCents: true, spentCents: true },
            },
          },
        },
        clipper: { select: { id: true } },
        earning: true,
      },
    });

    this.logger.log(`Found ${claims.length} verified claims to track`);
    let processed = 0;
    const exhaustedCampaigns = new Set<string>();

    for (const claim of claims) {
      try {
        const campaign = claim.campaignClip.campaign;

        // Skip if campaign already exhausted in this run
        if (exhaustedCampaigns.has(campaign.id)) continue;

        // Budget exhaustion check
        if (campaign.spentCents >= campaign.budgetCents) {
          await this.exhaustCampaign(campaign.id);
          exhaustedCampaigns.add(campaign.id);
          continue;
        }

        const aggregation: ClaimAggregation = {
          claimId: claim.id,
          clipperId: claim.clipper.id,
          campaignId: campaign.id,
          cpmCents: campaign.cpmCents,
          totalViews: 0,
          previousTotalViews: 0,
          submissions: [],
        };

        // Process each submission: fetch views via yt-dlp, create snapshots, detect fraud, aggregate
        for (const sub of claim.submissions) {
          // Fetch live view count via yt-dlp
          const fetchedViews = await this.viewFetch.fetchViewCount(sub.socialUrl, sub.platform);

          // If fetch failed, use stored viewCount as fallback
          const currentViews = fetchedViews ?? sub.viewCount;

          // Update stored viewCount with fresh data
          if (fetchedViews !== null) {
            await this.prisma.clipSubmission.update({
              where: { id: sub.id },
              data: { viewCount: fetchedViews },
            });
          }

          const lastSnapshot = sub.snapshots[0];
          const previousViews = lastSnapshot?.viewCount ?? 0;

          // Anti-fraud: detect suspicious view spikes (>10x average delta)
          const { flagged, flagReason } = this.detectFraud(
            currentViews,
            previousViews,
            sub.snapshots.map((s) => s.viewCount),
          );

          // Create snapshot
          await this.prisma.viewSnapshot.create({
            data: {
              submissionId: sub.id,
              viewCount: currentViews,
              flagged,
              flagReason,
            },
          });

          // Update last check timestamp
          await this.prisma.clipSubmission.update({
            where: { id: sub.id },
            data: { lastViewCheck: new Date() },
          });

          aggregation.submissions.push({
            id: sub.id,
            viewCount: currentViews,
            previousViewCount: previousViews,
            flagged,
            flagReason,
          });

          aggregation.totalViews += currentViews;
          aggregation.previousTotalViews += previousViews;
        }

        // If any submission is flagged, flag the whole claim for review
        const hasFraud = aggregation.submissions.some((s) => s.flagged);
        if (hasFraud && !claim.flaggedForReview) {
          await this.prisma.clipClaim.update({
            where: { id: claim.id },
            data: { flaggedForReview: true },
          });
          this.logger.warn(`Claim ${claim.id} flagged for fraud review`);
          continue; // Don't update earnings for flagged claims
        }

        // Skip earnings update if claim is flagged
        if (claim.flaggedForReview) continue;

        // Calculate earnings from aggregate views across all platforms
        const newViews = aggregation.totalViews - aggregation.previousTotalViews;

        // Handle view decreases (bot purge reconciliation)
        if (newViews < 0) {
          await this.handleViewDecrease(claim, aggregation, platformFee);
          processed++;
          continue;
        }

        if (newViews <= 0) continue;

        const grossCents = Math.floor((newViews / 1000) * aggregation.cpmCents);
        const netCents = Math.floor(grossCents * (1 - platformFee));
        if (netCents <= 0) continue;

        // Cap earnings to remaining campaign budget
        const remainingBudget = campaign.budgetCents - campaign.spentCents;
        const cappedGross = Math.min(grossCents, remainingBudget);
        const cappedNet = Math.floor(cappedGross * (1 - platformFee));
        if (cappedNet <= 0) continue;

        // Upsert earning for this claim (aggregated, not per submission)
        const existing = claim.earning;
        if (existing) {
          if (existing.status === 'PENDING') {
            await this.prisma.earning.update({
              where: { id: existing.id },
              data: { amountCents: { increment: cappedNet } },
            });
          }
        } else {
          await this.prisma.earning.create({
            data: {
              clipperId: aggregation.clipperId,
              claimId: claim.id,
              amountCents: cappedNet,
            },
          });
        }

        // Update claim earnedCents and set 48h payout hold from last snapshot
        await this.prisma.clipClaim.update({
          where: { id: claim.id },
          data: {
            earnedCents: { increment: cappedNet },
            payoutHoldUntil: new Date(Date.now() + PAYOUT_HOLD_HOURS * 60 * 60 * 1000),
          },
        });

        // Track campaign spend (gross amount)
        await this.prisma.campaign.update({
          where: { id: campaign.id },
          data: { spentCents: { increment: cappedGross } },
        });

        // Check budget exhaustion after spending
        if (campaign.spentCents + cappedGross >= campaign.budgetCents) {
          await this.exhaustCampaign(campaign.id);
          exhaustedCampaigns.add(campaign.id);
        }

        processed++;
      } catch (err) {
        this.logger.error(`Error tracking views for claim ${claim.id}: ${err}`);
      }
    }

    this.logger.log(
      `View tracking complete. Processed ${processed} claims. ${exhaustedCampaigns.size} campaigns exhausted.`,
    );
    return { processed, total: claims.length, exhausted: exhaustedCampaigns.size };
  }

  /**
   * Detect suspicious view patterns:
   * - Spike: delta > 10x average previous delta
   */
  private detectFraud(
    currentViews: number,
    previousViews: number,
    snapshotHistory: number[],
  ): { flagged: boolean; flagReason: string | null } {
    if (snapshotHistory.length < 2) {
      return { flagged: false, flagReason: null };
    }

    const delta = currentViews - previousViews;
    if (delta <= 0) return { flagged: false, flagReason: null };

    // Calculate average delta from history (snapshots are desc order)
    const deltas: number[] = [];
    for (let i = 0; i < snapshotHistory.length - 1; i++) {
      const d = snapshotHistory[i]! - snapshotHistory[i + 1]!;
      if (d > 0) deltas.push(d);
    }

    if (deltas.length === 0) return { flagged: false, flagReason: null };

    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    if (avgDelta > 0 && delta > avgDelta * 10) {
      return {
        flagged: true,
        flagReason: `View spike: ${delta} new views vs ${Math.round(avgDelta)} avg delta (>10x)`,
      };
    }

    return { flagged: false, flagReason: null };
  }

  /**
   * Handle view decreases (bot purge) — adjust earnings downward
   * if the decrease is > 10% of previous total.
   */
  private async handleViewDecrease(
    claim: {
      id: string;
      earnedCents: number;
      earning: { id: string; status: string; amountCents: number } | null;
    },
    aggregation: ClaimAggregation,
    platformFee: number,
  ) {
    const viewDrop = aggregation.previousTotalViews - aggregation.totalViews;
    const dropPercent =
      aggregation.previousTotalViews > 0 ? viewDrop / aggregation.previousTotalViews : 0;

    // Only adjust if drop > 10%
    if (dropPercent <= 0.1) return;

    const lostGross = Math.floor((viewDrop / 1000) * aggregation.cpmCents);
    const lostNet = Math.floor(lostGross * (1 - platformFee));
    if (lostNet <= 0) return;

    // Don't reduce below zero
    const adjustmentCents = Math.min(lostNet, claim.earnedCents);
    if (adjustmentCents <= 0) return;

    // Create EarningAdjustment record
    await this.prisma.earningAdjustment.create({
      data: {
        claimId: claim.id,
        deltaCents: -adjustmentCents,
        reason: `Bot purge: ${viewDrop} views removed (${(dropPercent * 100).toFixed(1)}% decrease)`,
      },
    });

    // Adjust earning if still pending
    if (claim.earning && claim.earning.status === 'PENDING') {
      const newAmount = Math.max(0, claim.earning.amountCents - adjustmentCents);
      await this.prisma.earning.update({
        where: { id: claim.earning.id },
        data: { amountCents: newAmount },
      });
    }

    // Adjust claim earnedCents and flag for review
    await this.prisma.clipClaim.update({
      where: { id: claim.id },
      data: {
        earnedCents: Math.max(0, claim.earnedCents - adjustmentCents),
        flaggedForReview: true,
      },
    });

    // Refund campaign spend
    await this.prisma.campaign.update({
      where: { id: aggregation.campaignId },
      data: { spentCents: { decrement: lostGross } },
    });

    this.logger.warn(
      `Claim ${claim.id}: bot purge detected. Adjusted -${adjustmentCents} cents (${viewDrop} views lost)`,
    );
  }

  /**
   * Mark campaign as EXHAUSTED and stop tracking.
   */
  private async exhaustCampaign(campaignId: string) {
    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'EXHAUSTED' },
    });
    this.logger.log(`Campaign ${campaignId} budget exhausted — status set to EXHAUSTED`);
  }
}
