/**
 * E2E Test: Multi-platform URL+fetch view tracking (BEA-24)
 *
 * Tests the full flow: claim creation -> multi-URL submission -> view tracking -> earnings.
 * Uses Prisma directly against the test DB and instantiates ClaimsService/ViewTrackingProcessor
 * with mocked Bull queue and ViewFetchService.
 *
 * Pre-requisites: DATABASE_URL set, schema migrated.
 * Run: npm run test:e2e
 */

import {
  PrismaClient,
  SocialPlatform,
  ClaimStatus,
  CampaignStatus,
  EarningStatus,
} from '@prisma/client';
import { ClaimsService } from '../../src/modules/claims/claims.service';
import { ViewTrackingProcessor } from '../../src/modules/payments/view-tracking.processor';
import { ViewFetchService } from '../../src/modules/payments/view-fetch.service';
import { PrismaService } from '../../src/prisma.service';
import * as bcrypt from 'bcrypt';

// ─── Test constants ───────────────────────────────────────────────
const TEST_PASSWORD = 'Test1234!';
const CPM_CENTS = 500; // $5 CPM
const BUDGET_CENTS = 100000; // $1000 budget
const PLATFORM_FEE = 0.20;

const TEST_URLS: Record<SocialPlatform, string> = {
  TIKTOK: 'https://www.tiktok.com/@e2euser/video/7000000000000000099',
  INSTAGRAM: 'https://www.instagram.com/reel/E2Etest99/',
  YOUTUBE: 'https://youtube.com/shorts/E2E99testXYZ',
};

// ─── Shared state ─────────────────────────────────────────────────
let prisma: PrismaClient;
let claimsService: ClaimsService;
let viewTrackingProcessor: ViewTrackingProcessor;
let mockViewFetch: jest.Mocked<ViewFetchService>;
let mockQueue: any;

let tenantId: string;
let infoproductorId: string;
let clipperId: string;
let clipId: string;
let campaignId: string;
let campaignClipId: string;

// ─── Setup / Teardown ─────────────────────────────────────────────

beforeAll(async () => {
  prisma = new PrismaClient();

  // Create PrismaService wrapper (same instance)
  const prismaService = prisma as unknown as PrismaService;

  // Mock Bull queue
  mockQueue = {
    add: jest.fn().mockResolvedValue({ id: 'mock-job' }),
  };

  // Mock ViewFetchService
  mockViewFetch = {
    fetchViewCount: jest.fn().mockResolvedValue(1000),
  } as any;

  // Instantiate services
  claimsService = new ClaimsService(prismaService, mockQueue);
  viewTrackingProcessor = new ViewTrackingProcessor(prismaService, mockViewFetch);

  // Seed base test data
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'e2e-multi-platform' },
    update: {},
    create: { name: 'E2E Multi-Platform', slug: 'e2e-multi-platform', plan: 'PRO' },
  });
  tenantId = tenant.id;

  const infoproductor = await prisma.user.upsert({
    where: { email: 'e2e-infoprod@test.kleo' },
    update: {},
    create: {
      email: 'e2e-infoprod@test.kleo',
      password: hashedPassword,
      name: 'E2E Infoproductor',
      userType: 'INFOPRODUCTOR',
      tenantId,
    },
  });
  infoproductorId = infoproductor.id;

  const clipper = await prisma.user.upsert({
    where: { email: 'e2e-clipper@test.kleo' },
    update: {},
    create: {
      email: 'e2e-clipper@test.kleo',
      password: hashedPassword,
      name: 'E2E Clipper',
      userType: 'CLIPPER',
      tenantId,
    },
  });
  clipperId = clipper.id;

  // Video project + clip
  const project = await prisma.videoProject.upsert({
    where: { id: 'e2e-mp-project' },
    update: {},
    create: {
      id: 'e2e-mp-project',
      userId: infoproductorId,
      tenantId,
      title: 'E2E MP Project',
      sourceType: 'UPLOAD',
    },
  });

  const clip = await prisma.clip.upsert({
    where: { id: 'e2e-mp-clip' },
    update: {},
    create: {
      id: 'e2e-mp-clip',
      projectId: project.id,
      title: 'E2E MP Clip',
      startTime: 0,
      endTime: 30,
      duration: 30,
      filePath: '/tmp/e2e-mp-clip.mp4',
    },
  });
  clipId = clip.id;
});

afterAll(async () => {
  // Cleanup test data
  await prisma.earningAdjustment.deleteMany({ where: { claim: { campaignClip: { campaign: { tenantId } } } } });
  await prisma.earning.deleteMany({ where: { clipper: { tenantId } } });
  await prisma.viewSnapshot.deleteMany({ where: { submission: { claim: { campaignClip: { campaign: { tenantId } } } } } });
  await prisma.clipSubmission.deleteMany({ where: { claim: { campaignClip: { campaign: { tenantId } } } } });
  await prisma.clipClaim.deleteMany({ where: { campaignClip: { campaign: { tenantId } } } });
  await prisma.campaignClip.deleteMany({ where: { campaign: { tenantId } } });
  await prisma.campaign.deleteMany({ where: { tenantId } });
  await prisma.clipWatermark.deleteMany({ where: { clip: { project: { tenantId } } } });
  await prisma.clip.deleteMany({ where: { project: { tenantId } } });
  await prisma.videoProject.deleteMany({ where: { tenantId } });
  await prisma.user.deleteMany({ where: { tenantId } });
  await prisma.tenant.deleteMany({ where: { id: tenantId } });
  await prisma.$disconnect();
});

// Helper: create a fresh campaign + campaign clip for each test group
async function createCampaign(opts: { budgetCents?: number; cpmCents?: number; status?: CampaignStatus } = {}) {
  const campaign = await prisma.campaign.create({
    data: {
      userId: infoproductorId,
      tenantId,
      title: `E2E Campaign ${Date.now()}`,
      cpmCents: opts.cpmCents ?? CPM_CENTS,
      budgetCents: opts.budgetCents ?? BUDGET_CENTS,
      status: opts.status ?? CampaignStatus.ACTIVE,
    },
  });
  campaignId = campaign.id;

  const cc = await prisma.campaignClip.create({
    data: { campaignId: campaign.id, clipId, isPublic: true },
  });
  campaignClipId = cc.id;

  return { campaign, campaignClip: cc };
}

// ─────────────────────────────────────────────────────────────────
// TEST 1: Happy path — 3 platforms
// ─────────────────────────────────────────────────────────────────
describe('Happy path: 3-platform submission + view tracking + earnings', () => {
  let claimId: string;

  beforeAll(async () => {
    await createCampaign();
  });

  it('should create a claim for the clipper', async () => {
    const claim = await claimsService.create(clipperId, { campaignClipId });

    expect(claim).toBeDefined();
    expect(claim.clipperId).toBe(clipperId);
    expect(claim.campaignClipId).toBe(campaignClipId);
    expect(claim.status).toBe(ClaimStatus.CLAIMED);

    claimId = claim.id;
  });

  it('should submit 3 URLs (one per platform) via submitMulti', async () => {
    const submissions = await claimsService.submitMulti(claimId, clipperId, {
      urls: [
        { platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK },
        { platform: SocialPlatform.INSTAGRAM, url: TEST_URLS.INSTAGRAM },
        { platform: SocialPlatform.YOUTUBE, url: TEST_URLS.YOUTUBE },
      ],
    });

    expect(submissions).toHaveLength(3);
    const platforms = submissions.map((s) => s.platform).sort();
    expect(platforms).toEqual(['INSTAGRAM', 'TIKTOK', 'YOUTUBE']);

    // Claim should be SUBMITTED
    const claim = await prisma.clipClaim.findUnique({ where: { id: claimId } });
    expect(claim!.status).toBe(ClaimStatus.SUBMITTED);
  });

  it('should have queued 3 verification jobs', () => {
    expect(mockQueue.add).toHaveBeenCalledTimes(3);
    for (const call of mockQueue.add.mock.calls) {
      expect(call[0]).toBe('verify-clip');
      expect(call[1]).toHaveProperty('submissionId');
    }
  });

  it('should create ViewSnapshots and calculate earnings via view tracking', async () => {
    // Set submissions to VERIFIED so the processor picks them up
    await prisma.clipClaim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.VERIFIED },
    });
    const subs = await prisma.clipSubmission.findMany({ where: { claimId } });
    for (const sub of subs) {
      await prisma.clipSubmission.update({
        where: { id: sub.id },
        data: { verifiedAt: new Date() },
      });
    }

    // Mock yt-dlp returning 1000 views per platform
    mockViewFetch.fetchViewCount.mockResolvedValue(1000);

    // Run the processor
    const result = await viewTrackingProcessor.handleTrackViews({} as any);

    expect(result.processed).toBeGreaterThanOrEqual(1);

    // Verify 3 ViewSnapshots
    const snapshots = await prisma.viewSnapshot.findMany({
      where: { submissionId: { in: subs.map((s) => s.id) } },
    });
    expect(snapshots).toHaveLength(3);
    snapshots.forEach((snap) => expect(snap.viewCount).toBe(1000));

    // Verify earnings: 3000 total views, gross = 3000/1000 * 500 = 1500, net = 1500 * 0.80 = 1200
    const earning = await prisma.earning.findUnique({ where: { claimId } });
    expect(earning).toBeDefined();
    expect(earning!.amountCents).toBe(1200);
    expect(earning!.status).toBe(EarningStatus.PENDING);

    // Verify campaign spend (gross)
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    expect(campaign!.spentCents).toBe(1500);

    // Verify claim earnedCents
    const claim = await prisma.clipClaim.findUnique({ where: { id: claimId } });
    expect(claim!.earnedCents).toBe(1200);
    expect(claim!.payoutHoldUntil).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// TEST 2: Partial submission — 1 platform only
// ─────────────────────────────────────────────────────────────────
describe('Partial submission: single platform', () => {
  let claimId: string;

  beforeAll(async () => {
    await createCampaign();
    mockQueue.add.mockClear();
  });

  it('should create claim and submit only TikTok URL', async () => {
    const claim = await claimsService.create(clipperId, { campaignClipId });
    claimId = claim.id;

    const submissions = await claimsService.submitMulti(claimId, clipperId, {
      urls: [{ platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK }],
    });

    expect(submissions).toHaveLength(1);
    expect(submissions[0].platform).toBe('TIKTOK');
  });

  it('should go to SUBMITTED with just 1 submission', async () => {
    const claim = await prisma.clipClaim.findUnique({ where: { id: claimId } });
    expect(claim!.status).toBe(ClaimStatus.SUBMITTED);
  });

  it('should calculate earnings from single platform only', async () => {
    await prisma.clipClaim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.VERIFIED },
    });
    const subs = await prisma.clipSubmission.findMany({ where: { claimId } });
    for (const sub of subs) {
      await prisma.clipSubmission.update({
        where: { id: sub.id },
        data: { verifiedAt: new Date() },
      });
    }

    mockViewFetch.fetchViewCount.mockResolvedValue(1000);
    await viewTrackingProcessor.handleTrackViews({} as any);

    const earning = await prisma.earning.findUnique({ where: { claimId } });
    expect(earning).toBeDefined();
    // 1 platform: 1000 views, gross = 500, net = 400
    expect(earning!.amountCents).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────
// TEST 3: Duplicate prevention
// ─────────────────────────────────────────────────────────────────
describe('Duplicate prevention', () => {
  beforeAll(async () => {
    await createCampaign();
    mockQueue.add.mockClear();
  });

  it('should prevent same clipper from creating 2 claims on same campaign clip', async () => {
    await claimsService.create(clipperId, { campaignClipId });

    await expect(
      claimsService.create(clipperId, { campaignClipId }),
    ).rejects.toThrow('You already have an active claim for this clip');
  });

  it('should prevent duplicate platform in same submission request', async () => {
    const claim = await prisma.clipClaim.findFirst({
      where: { campaignClipId, clipperId },
    });

    await expect(
      claimsService.submitMulti(claim!.id, clipperId, {
        urls: [
          { platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK },
          { platform: SocialPlatform.TIKTOK, url: 'https://www.tiktok.com/@other/video/7000000000000000002' },
        ],
      }),
    ).rejects.toThrow('Duplicate platforms in submission');
  });

  it('should prevent submitting same platform URL twice (across requests)', async () => {
    const claim = await prisma.clipClaim.findFirst({
      where: { campaignClipId, clipperId },
    });

    // First submission: TikTok
    await claimsService.submitMulti(claim!.id, clipperId, {
      urls: [{ platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK }],
    });

    // Second submission: TikTok again — should fail
    await expect(
      claimsService.submitMulti(claim!.id, clipperId, {
        urls: [{ platform: SocialPlatform.TIKTOK, url: 'https://www.tiktok.com/@other/video/7000000000000000003' }],
      }),
    ).rejects.toThrow(/Submissions already exist for platforms/);
  });
});

// ─────────────────────────────────────────────────────────────────
// TEST 4: Budget exhaustion
// ─────────────────────────────────────────────────────────────────
describe('Budget exhaustion', () => {
  let claimId: string;

  beforeAll(async () => {
    // Create a campaign with a tiny budget: $7.50 (750 cents)
    // 3 submissions x 1000 views = gross 1500 cents > budget of 750 cents
    await createCampaign({ budgetCents: 750 });
    mockQueue.add.mockClear();
  });

  it('should cap earnings to remaining budget and mark campaign EXHAUSTED', async () => {
    const claim = await claimsService.create(clipperId, { campaignClipId });
    claimId = claim.id;

    await claimsService.submitMulti(claimId, clipperId, {
      urls: [
        { platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK },
        { platform: SocialPlatform.INSTAGRAM, url: TEST_URLS.INSTAGRAM },
        { platform: SocialPlatform.YOUTUBE, url: TEST_URLS.YOUTUBE },
      ],
    });

    // Set to VERIFIED
    await prisma.clipClaim.update({
      where: { id: claimId },
      data: { status: ClaimStatus.VERIFIED },
    });
    const subs = await prisma.clipSubmission.findMany({ where: { claimId } });
    for (const sub of subs) {
      await prisma.clipSubmission.update({
        where: { id: sub.id },
        data: { verifiedAt: new Date() },
      });
    }

    mockViewFetch.fetchViewCount.mockResolvedValue(1000);
    await viewTrackingProcessor.handleTrackViews({} as any);

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });

    // Campaign should be EXHAUSTED (spent >= budget during processing)
    expect(campaign!.status).toBe(CampaignStatus.EXHAUSTED);

    // Earnings should not exceed budget
    const earning = await prisma.earning.findUnique({ where: { claimId } });
    if (earning) {
      expect(earning.amountCents).toBeLessThanOrEqual(campaign!.budgetCents);
    }

    // No more earnings should be created on second run
    const earningBefore = earning?.amountCents ?? 0;
    await viewTrackingProcessor.handleTrackViews({} as any);
    const earningAfter = await prisma.earning.findUnique({ where: { claimId } });
    expect(earningAfter?.amountCents ?? 0).toBe(earningBefore);
  });
});

// ─────────────────────────────────────────────────────────────────
// TEST 5: Edge cases
// ─────────────────────────────────────────────────────────────────
describe('Edge cases', () => {
  beforeAll(async () => {
    mockQueue.add.mockClear();
  });

  it('should reject URL that does not match declared platform', async () => {
    await createCampaign();
    const claim = await claimsService.create(clipperId, { campaignClipId });

    // TikTok URL declared as YouTube
    await expect(
      claimsService.submitMulti(claim.id, clipperId, {
        urls: [
          { platform: SocialPlatform.YOUTUBE, url: TEST_URLS.TIKTOK },
        ],
      }),
    ).rejects.toThrow(/URL does not match platform/);
  });

  it('should reject claim on inactive campaign', async () => {
    await createCampaign({ status: CampaignStatus.PAUSED });

    await expect(
      claimsService.create(clipperId, { campaignClipId }),
    ).rejects.toThrow('Campaign is not active');
  });

  it('should prevent infoproductor from claiming their own campaign clip', async () => {
    await createCampaign();

    await expect(
      claimsService.create(infoproductorId, { campaignClipId }),
    ).rejects.toThrow('Cannot claim clips from your own campaign');
  });

  it('should not submit on a non-CLAIMED status claim', async () => {
    await createCampaign();
    const claim = await claimsService.create(clipperId, { campaignClipId });

    // Submit once (moves to SUBMITTED)
    await claimsService.submitMulti(claim.id, clipperId, {
      urls: [{ platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK }],
    });

    // Set to VERIFIED (not submittable via single submit)
    await prisma.clipClaim.update({
      where: { id: claim.id },
      data: { status: ClaimStatus.VERIFIED },
    });

    // Single submit should reject since status is VERIFIED (not CLAIMED)
    await expect(
      claimsService.submit(claim.id, clipperId, { socialUrl: TEST_URLS.INSTAGRAM }),
    ).rejects.toThrow('Claim is not in CLAIMED status');
  });

  it('should handle view fetch failure gracefully (fallback to stored count)', async () => {
    await createCampaign();
    const claim = await claimsService.create(clipperId, { campaignClipId });
    await claimsService.submitMulti(claim.id, clipperId, {
      urls: [{ platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK }],
    });

    await prisma.clipClaim.update({
      where: { id: claim.id },
      data: { status: ClaimStatus.VERIFIED },
    });
    const subs = await prisma.clipSubmission.findMany({ where: { claimId: claim.id } });
    for (const sub of subs) {
      await prisma.clipSubmission.update({
        where: { id: sub.id },
        data: { verifiedAt: new Date(), viewCount: 500 },
      });
    }

    // ViewFetch returns null (failure) — processor should use stored viewCount
    mockViewFetch.fetchViewCount.mockResolvedValue(null);
    await viewTrackingProcessor.handleTrackViews({} as any);

    const snapshots = await prisma.viewSnapshot.findMany({
      where: { submissionId: { in: subs.map((s) => s.id) } },
    });
    // Should still create snapshot using fallback viewCount
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    expect(snapshots[0].viewCount).toBe(500);
  });

  it('should detect idempotency — second run with same views produces no new earnings', async () => {
    await createCampaign();
    const claim = await claimsService.create(clipperId, { campaignClipId });
    await claimsService.submitMulti(claim.id, clipperId, {
      urls: [{ platform: SocialPlatform.TIKTOK, url: TEST_URLS.TIKTOK }],
    });

    await prisma.clipClaim.update({
      where: { id: claim.id },
      data: { status: ClaimStatus.VERIFIED },
    });
    const subs = await prisma.clipSubmission.findMany({ where: { claimId: claim.id } });
    for (const sub of subs) {
      await prisma.clipSubmission.update({
        where: { id: sub.id },
        data: { verifiedAt: new Date() },
      });
    }

    mockViewFetch.fetchViewCount.mockResolvedValue(1000);

    // First run
    await viewTrackingProcessor.handleTrackViews({} as any);
    const earningAfterRun1 = await prisma.earning.findUnique({ where: { claimId: claim.id } });

    // Second run — same views
    await viewTrackingProcessor.handleTrackViews({} as any);
    const earningAfterRun2 = await prisma.earning.findUnique({ where: { claimId: claim.id } });

    expect(earningAfterRun2!.amountCents).toBe(earningAfterRun1!.amountCents);
  });
});
