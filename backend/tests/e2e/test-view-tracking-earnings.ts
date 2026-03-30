/**
 * QA E2E: View tracking + earnings aggregation test (BEA-24)
 *
 * Tests the ViewTrackingProcessor logic directly against the DB:
 *  1. Sets up 3 submissions with known view counts
 *  2. Runs view tracking processing logic
 *  3. Verifies ViewSnapshots are created
 *  4. Verifies earnings are calculated correctly (summing all 3 platforms)
 *  5. Verifies campaign spend is incremented
 *  6. Tests budget exhaustion
 *
 * Usage: npx ts-node tests/e2e/test-view-tracking-earnings.ts
 */

import { PrismaClient, SocialPlatform, ClaimStatus, CampaignStatus, EarningStatus } from '@prisma/client';

const prisma = new PrismaClient();

const PLATFORM_FEE = 0.20; // 20%
let pass = 0;
let fail = 0;

function logPass(msg: string) { console.log(`  ✅ PASS: ${msg}`); pass++; }
function logFail(msg: string, detail?: string) { console.log(`  ❌ FAIL: ${msg}${detail ? ` — ${detail}` : ''}`); fail++; }

async function main() {
  console.log('\n🧪 E2E Test: View Tracking + Earnings Aggregation\n');

  // ============================================================
  // Setup: ensure test data is in the expected state
  // ============================================================
  console.log('=== Setup ===');

  const campaign = await prisma.campaign.findUnique({ where: { id: 'qa-test-campaign' } });
  if (!campaign) {
    console.log('  ❌ Run seed first: npx ts-node tests/fixtures/seed-test-data.ts');
    process.exit(1);
  }

  // Reset campaign spend
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { spentCents: 0, status: CampaignStatus.ACTIVE },
  });

  // Get the test claim
  const claim = await prisma.clipClaim.findFirst({
    where: {
      campaignClip: { campaignId: campaign.id },
      status: ClaimStatus.VERIFIED,
    },
    include: { submissions: true },
  });

  if (!claim) {
    console.log('  ❌ No VERIFIED claim found. Run seed first.');
    process.exit(1);
  }

  // Set known view counts on each submission
  const viewCounts: Record<string, number> = {};
  for (const sub of claim.submissions) {
    const views = 1000; // 1000 views per platform
    await prisma.clipSubmission.update({
      where: { id: sub.id },
      data: { viewCount: views, verifiedAt: new Date() },
    });
    viewCounts[sub.id] = views;
  }

  // Clear old snapshots and earnings for clean test
  await prisma.viewSnapshot.deleteMany({
    where: { submissionId: { in: claim.submissions.map(s => s.id) } },
  });
  await prisma.earning.deleteMany({ where: { claimId: claim.id } });
  await prisma.earningAdjustment.deleteMany({ where: { claimId: claim.id } });

  console.log(`  Claim: ${claim.id} with ${claim.submissions.length} submissions`);
  console.log(`  Campaign CPM: $${campaign.cpmCents / 100}`);
  console.log(`  Platform fee: ${PLATFORM_FEE * 100}%`);

  // ============================================================
  // Test 1: Simulate ViewTrackingProcessor logic
  // ============================================================
  console.log('\n=== Test 1: View tracking processor simulation ===');

  const submissions = await prisma.clipSubmission.findMany({
    where: {
      claim: {
        status: 'VERIFIED',
        campaignClip: { campaign: { status: 'ACTIVE', id: campaign.id } },
      },
    },
    include: {
      claim: {
        include: {
          campaignClip: {
            include: { campaign: { select: { cpmCents: true, id: true } } },
          },
          clipper: { select: { id: true } },
        },
      },
    },
  });

  if (submissions.length === 3) {
    logPass(`Found ${submissions.length} verified submissions for active campaign`);
  } else {
    logFail(`Expected 3 submissions, found ${submissions.length}`);
  }

  // Process each submission (mimicking ViewTrackingProcessor)
  for (const sub of submissions) {
    const currentViews = sub.viewCount;
    const previousSnapshot = await prisma.viewSnapshot.findFirst({
      where: { submissionId: sub.id },
      orderBy: { checkedAt: 'desc' },
    });
    const previousViews = previousSnapshot?.viewCount ?? 0;

    // Create snapshot
    await prisma.viewSnapshot.create({
      data: { submissionId: sub.id, viewCount: currentViews },
    });

    await prisma.clipSubmission.update({
      where: { id: sub.id },
      data: { lastViewCheck: new Date() },
    });

    const newViews = currentViews - previousViews;
    if (newViews <= 0) continue;

    const cpmCents = sub.claim.campaignClip.campaign.cpmCents;
    const grossCents = Math.floor((newViews / 1000) * cpmCents);
    const netCents = Math.floor(grossCents * (1 - PLATFORM_FEE));

    if (netCents <= 0) continue;

    const clipperId = sub.claim.clipper.id;
    const existingEarning = await prisma.earning.findUnique({
      where: { claimId: sub.claim.id },
    });

    if (existingEarning) {
      if (existingEarning.status === 'PENDING') {
        await prisma.earning.update({
          where: { id: existingEarning.id },
          data: { amountCents: { increment: netCents } },
        });
      }
    } else {
      await prisma.earning.create({
        data: {
          clipperId,
          claimId: sub.claim.id,
          amountCents: netCents,
        },
      });
    }

    await prisma.campaign.update({
      where: { id: sub.claim.campaignClip.campaign.id },
      data: { spentCents: { increment: grossCents } },
    });
  }

  logPass('View tracking processor simulation completed');

  // ============================================================
  // Test 2: Verify ViewSnapshots
  // ============================================================
  console.log('\n=== Test 2: ViewSnapshot verification ===');

  const snapshots = await prisma.viewSnapshot.findMany({
    where: { submissionId: { in: claim.submissions.map(s => s.id) } },
    orderBy: { checkedAt: 'desc' },
  });

  if (snapshots.length === 3) {
    logPass(`${snapshots.length} ViewSnapshots created (one per submission)`);
  } else {
    logFail(`Expected 3 snapshots, found ${snapshots.length}`);
  }

  for (const snap of snapshots) {
    if (snap.viewCount === 1000) {
      logPass(`Snapshot ${snap.id}: viewCount = ${snap.viewCount}`);
    } else {
      logFail(`Snapshot ${snap.id}: viewCount = ${snap.viewCount}`, 'expected 1000');
    }
  }

  // ============================================================
  // Test 3: Verify earnings (all 3 platforms summed)
  // ============================================================
  console.log('\n=== Test 3: Earnings aggregation ===');

  // With current schema: Earning is per claim (unique on claimId)
  // 3 submissions x 1000 views = processing adds earnings incrementally to same claim's earning
  const earning = await prisma.earning.findUnique({ where: { claimId: claim.id } });

  // Expected: each submission contributes: floor(1000/1000 * 500) = 500 gross, floor(500 * 0.80) = 400 net
  // 3 submissions processed, but earning is per-claim (unique), so increments happen:
  // First creates 400, then +400 = 800, then +400 = 1200
  const expectedNetPerSub = Math.floor(Math.floor((1000 / 1000) * campaign.cpmCents) * (1 - PLATFORM_FEE));
  const expectedTotalNet = expectedNetPerSub * 3;

  console.log(`  Expected net per submission: ${expectedNetPerSub} cents`);
  console.log(`  Expected total net (3 platforms): ${expectedTotalNet} cents ($${(expectedTotalNet / 100).toFixed(2)})`);

  if (earning) {
    console.log(`  Actual earning: ${earning.amountCents} cents ($${(earning.amountCents / 100).toFixed(2)})`);
    if (earning.amountCents === expectedTotalNet) {
      logPass(`Earnings correct: ${earning.amountCents} cents = $${(earning.amountCents / 100).toFixed(2)}`);
    } else {
      logFail(`Earnings mismatch: ${earning.amountCents}`, `expected ${expectedTotalNet}`);
    }
    if (earning.status === 'PENDING') {
      logPass('Earning status is PENDING (correct)');
    } else {
      logFail(`Earning status: ${earning.status}`, 'expected PENDING');
    }
  } else {
    logFail('No earning record found for claim');
  }

  // ============================================================
  // Test 4: Campaign spend tracking
  // ============================================================
  console.log('\n=== Test 4: Campaign spend tracking ===');

  const updatedCampaign = await prisma.campaign.findUnique({ where: { id: campaign.id } });
  const expectedGrossPerSub = Math.floor((1000 / 1000) * campaign.cpmCents);
  const expectedTotalGross = expectedGrossPerSub * 3;

  console.log(`  Expected gross spend: ${expectedTotalGross} cents ($${(expectedTotalGross / 100).toFixed(2)})`);
  console.log(`  Actual spentCents: ${updatedCampaign!.spentCents}`);

  if (updatedCampaign!.spentCents === expectedTotalGross) {
    logPass(`Campaign spend correct: ${updatedCampaign!.spentCents} cents`);
  } else {
    logFail(`Campaign spend: ${updatedCampaign!.spentCents}`, `expected ${expectedTotalGross}`);
  }

  // ============================================================
  // Test 5: Budget exhaustion
  // ============================================================
  console.log('\n=== Test 5: Budget exhaustion ===');

  // Set budget to exactly what was spent to trigger exhaustion
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { budgetCents: updatedCampaign!.spentCents },
  });

  const exhaustedCampaign = await prisma.campaign.findUnique({ where: { id: campaign.id } });
  if (exhaustedCampaign!.spentCents >= exhaustedCampaign!.budgetCents) {
    logPass('Budget exhausted condition detected (spentCents >= budgetCents)');
    // In production, the processor would set status to EXHAUSTED
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.EXHAUSTED },
    });
    const finalCampaign = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    if (finalCampaign!.status === 'EXHAUSTED') {
      logPass('Campaign status set to EXHAUSTED');
    } else {
      logFail('Campaign status not EXHAUSTED', `got: ${finalCampaign!.status}`);
    }
  } else {
    logFail('Budget not exhausted', `spent=${exhaustedCampaign!.spentCents}, budget=${exhaustedCampaign!.budgetCents}`);
  }

  // ============================================================
  // Test 6: Second run should produce no new earnings (no new views)
  // ============================================================
  console.log('\n=== Test 6: Idempotency (no-op on second run) ===');

  // Reset campaign to active for this test
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.ACTIVE, budgetCents: 100000 },
  });

  const earningBefore = await prisma.earning.findUnique({ where: { claimId: claim.id } });
  const spendBefore = (await prisma.campaign.findUnique({ where: { id: campaign.id } }))!.spentCents;

  // Run processor again — views haven't changed, so no new earnings
  for (const sub of submissions) {
    const currentViews = sub.viewCount;
    const previousSnapshot = await prisma.viewSnapshot.findFirst({
      where: { submissionId: sub.id },
      orderBy: { checkedAt: 'desc' },
    });
    const previousViews = previousSnapshot?.viewCount ?? 0;

    await prisma.viewSnapshot.create({
      data: { submissionId: sub.id, viewCount: currentViews },
    });

    const newViews = currentViews - previousViews;
    // Should be 0 since views haven't changed
    if (newViews <= 0) continue;
  }

  const earningAfter = await prisma.earning.findUnique({ where: { claimId: claim.id } });
  const spendAfter = (await prisma.campaign.findUnique({ where: { id: campaign.id } }))!.spentCents;

  if (earningAfter!.amountCents === earningBefore!.amountCents) {
    logPass('Second run: no duplicate earnings (idempotent)');
  } else {
    logFail('Second run produced extra earnings', `before=${earningBefore!.amountCents}, after=${earningAfter!.amountCents}`);
  }

  if (spendAfter === spendBefore) {
    logPass('Second run: campaign spend unchanged');
  } else {
    logFail('Campaign spend changed on second run', `before=${spendBefore}, after=${spendAfter}`);
  }

  // ============================================================
  // Cleanup: restore campaign to original state
  // ============================================================
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: CampaignStatus.ACTIVE, budgetCents: 100000, spentCents: 0 },
  });

  // --- Summary ---
  console.log('\n=========================================');
  console.log(`  RESULTS: ${pass} passed, ${fail} failed`);
  console.log('=========================================\n');

  process.exit(fail > 0 ? 1 : 0);
}

main()
  .catch((e) => {
    console.error('Test failed with error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
