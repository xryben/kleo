import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma.service';

@Processor('payout-processing')
export class PayoutProcessor {
  private readonly logger = new Logger(PayoutProcessor.name);
  private stripe: Stripe | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2026-03-25.dahlia',
      });
    } else {
      this.logger.warn(
        'STRIPE_SECRET_KEY is not set — payout processing will be unavailable',
      );
    }
  }

  @Process('process-payouts')
  async handleProcessPayouts(job: Job) {
    if (!this.stripe) {
      this.logger.warn('Skipping payout processing — Stripe is not configured');
      return { success: 0, total: 0 };
    }

    this.logger.log('Starting automatic payout processing...');
    const minPayoutCents = 2500; // $25 minimum

    // Group pending earnings by clipper, excluding claims still under 48h hold
    const clippers = await this.prisma.earning.groupBy({
      by: ['clipperId'],
      where: {
        status: 'PENDING',
        claim: {
          OR: [
            { payoutHoldUntil: null },
            { payoutHoldUntil: { lt: new Date() } },
          ],
          flaggedForReview: false,
        },
      },
      _sum: { amountCents: true },
      having: { amountCents: { _sum: { gte: minPayoutCents } } },
    });

    this.logger.log(`Found ${clippers.length} clippers eligible for payout`);
    let successCount = 0;

    for (const group of clippers) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: group.clipperId },
        });

        if (!user?.stripeConnectId) {
          this.logger.warn(
            `Clipper ${group.clipperId} has no Connect account, skipping`,
          );
          continue;
        }

        // Verify Connect account is active
        const account = await this.stripe.accounts.retrieve(
          user.stripeConnectId,
        );
        if (!account.payouts_enabled) {
          this.logger.warn(
            `Clipper ${group.clipperId} Connect account not verified, skipping`,
          );
          continue;
        }

        const pendingEarnings = await this.prisma.earning.findMany({
          where: {
            clipperId: group.clipperId,
            status: 'PENDING',
            claim: {
              OR: [
                { payoutHoldUntil: null },
                { payoutHoldUntil: { lt: new Date() } },
              ],
              flaggedForReview: false,
            },
          },
        });
        const totalCents = pendingEarnings.reduce(
          (sum, e) => sum + e.amountCents,
          0,
        );
        if (totalCents < minPayoutCents) continue;

        // Create Stripe transfer
        const transfer = await this.stripe.transfers.create({
          amount: totalCents,
          currency: 'usd',
          destination: user.stripeConnectId,
          metadata: { clipperId: group.clipperId, auto: 'true' },
        });

        // Record payout and mark earnings as paid
        await this.prisma.$transaction(async (tx) => {
          await tx.payout.create({
            data: {
              clipperId: group.clipperId,
              amountCents: totalCents,
              stripeTransferId: transfer.id,
              status: 'COMPLETED',
            },
          });

          await tx.earning.updateMany({
            where: { id: { in: pendingEarnings.map((e) => e.id) } },
            data: { status: 'PAID', paidAt: new Date() },
          });
        });

        successCount++;
        this.logger.log(
          `Payout of $${(totalCents / 100).toFixed(2)} sent to clipper ${group.clipperId}`,
        );
      } catch (err) {
        this.logger.error(
          `Payout failed for clipper ${group.clipperId}: ${err}`,
        );
      }
    }

    this.logger.log(
      `Payout processing complete. ${successCount}/${clippers.length} payouts sent.`,
    );
    return { success: successCount, total: clippers.length };
  }
}
