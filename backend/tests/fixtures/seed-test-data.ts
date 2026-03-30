/**
 * Seed script for QA E2E testing of multi-platform URL+fetch view tracking.
 *
 * Creates:
 *  - 1 infoproductor user + 1 clipper user
 *  - 1 tenant, 1 video project, 1 clip with watermark
 *  - 1 active campaign with budget
 *  - 1 campaign clip (public)
 *  - 1 ClipClaim for the clipper
 *  - 3 ClipSubmissions (TikTok, Instagram, YouTube) linked to the same claim
 *  - Sets claim status to VERIFIED so view tracking can process it
 *
 * Usage: npx ts-node tests/fixtures/seed-test-data.ts
 */

import { PrismaClient, SocialPlatform, ClaimStatus, CampaignStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const TEST_PASSWORD = 'Test1234!';

// Sample social URLs for testing (these are format-valid but may not resolve)
const TEST_URLS: Record<SocialPlatform, string> = {
  TIKTOK: 'https://www.tiktok.com/@testuser/video/7000000000000000001',
  INSTAGRAM: 'https://www.instagram.com/reel/ABC123test/',
  YOUTUBE: 'https://youtube.com/shorts/dQw4w9WgXcQ',
};

async function main() {
  console.log('🧪 Seeding QA test data for BEA-24...\n');

  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  // 1. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'qa-test-tenant' },
    update: {},
    create: {
      name: 'QA Test Tenant',
      slug: 'qa-test-tenant',
      plan: 'PRO',
    },
  });
  console.log(`  Tenant: ${tenant.id} (${tenant.slug})`);

  // 2. Users
  const infoproductor = await prisma.user.upsert({
    where: { email: 'qa-infoproductor@test.kleo' },
    update: {},
    create: {
      email: 'qa-infoproductor@test.kleo',
      password: hashedPassword,
      name: 'QA Infoproductor',
      userType: 'INFOPRODUCTOR',
      tenantId: tenant.id,
    },
  });
  console.log(`  Infoproductor: ${infoproductor.id} (${infoproductor.email})`);

  const clipper = await prisma.user.upsert({
    where: { email: 'qa-clipper@test.kleo' },
    update: {},
    create: {
      email: 'qa-clipper@test.kleo',
      password: hashedPassword,
      name: 'QA Clipper',
      userType: 'CLIPPER',
      tenantId: tenant.id,
    },
  });
  console.log(`  Clipper: ${clipper.id} (${clipper.email})`);

  // 3. Video project + clip
  const project = await prisma.videoProject.upsert({
    where: { id: 'qa-test-project' },
    update: {},
    create: {
      id: 'qa-test-project',
      userId: infoproductor.id,
      tenantId: tenant.id,
      title: 'QA Test Project',
      sourceType: 'UPLOAD',
    },
  });
  console.log(`  Project: ${project.id}`);

  const clip = await prisma.clip.upsert({
    where: { id: 'qa-test-clip' },
    update: {},
    create: {
      id: 'qa-test-clip',
      projectId: project.id,
      title: 'QA Test Clip',
      startTime: 0,
      endTime: 30,
      duration: 30,
      filePath: '/tmp/qa-test-clip.mp4',
    },
  });
  console.log(`  Clip: ${clip.id}`);

  // Watermark
  await prisma.clipWatermark.upsert({
    where: { id: 'qa-test-watermark' },
    update: {},
    create: {
      id: 'qa-test-watermark',
      clipId: clip.id,
      uuid: 'KLEO-qa-test-uuid-1234',
      method: 'TEXT_OVERLAY',
    },
  });
  console.log(`  Watermark: KLEO-qa-test-uuid-1234`);

  // 4. Campaign
  const campaign = await prisma.campaign.upsert({
    where: { id: 'qa-test-campaign' },
    update: { status: CampaignStatus.ACTIVE, spentCents: 0 },
    create: {
      id: 'qa-test-campaign',
      userId: infoproductor.id,
      tenantId: tenant.id,
      title: 'QA Test Campaign',
      description: 'Campaign for QA E2E testing',
      cpmCents: 500, // $5 CPM
      budgetCents: 100000, // $1000 budget
      status: CampaignStatus.ACTIVE,
    },
  });
  console.log(`  Campaign: ${campaign.id} (CPM: $${campaign.cpmCents / 100}, Budget: $${campaign.budgetCents / 100})`);

  // 5. Campaign clip
  const campaignClip = await prisma.campaignClip.upsert({
    where: { campaignId_clipId: { campaignId: campaign.id, clipId: clip.id } },
    update: {},
    create: {
      campaignId: campaign.id,
      clipId: clip.id,
      isPublic: true,
    },
  });
  console.log(`  CampaignClip: ${campaignClip.id}`);

  // 6. ClipClaim (one claim, multiple submissions)
  const claim = await prisma.clipClaim.upsert({
    where: { campaignClipId_clipperId: { campaignClipId: campaignClip.id, clipperId: clipper.id } },
    update: { status: ClaimStatus.VERIFIED },
    create: {
      campaignClipId: campaignClip.id,
      clipperId: clipper.id,
      status: ClaimStatus.VERIFIED,
    },
  });
  console.log(`  ClipClaim: ${claim.id} (status: VERIFIED)`);

  // 7. Three ClipSubmissions (one per platform)
  for (const platform of [SocialPlatform.TIKTOK, SocialPlatform.INSTAGRAM, SocialPlatform.YOUTUBE]) {
    const submission = await prisma.clipSubmission.upsert({
      where: { claimId_platform: { claimId: claim.id, platform } },
      update: { viewCount: 1000, verifiedAt: new Date() },
      create: {
        claimId: claim.id,
        socialUrl: TEST_URLS[platform],
        platform,
        viewCount: 1000,
        verifiedAt: new Date(),
      },
    });
    console.log(`  Submission [${platform}]: ${submission.id} (views: ${submission.viewCount})`);
  }

  // 8. Print summary
  console.log('\n✅ QA test data seeded successfully.');
  console.log('\nTest credentials:');
  console.log(`  Infoproductor: qa-infoproductor@test.kleo / ${TEST_PASSWORD}`);
  console.log(`  Clipper: qa-clipper@test.kleo / ${TEST_PASSWORD}`);
  console.log(`\nClaim ID: ${claim.id}`);
  console.log(`Campaign ID: ${campaign.id}`);
  console.log(`Expected: 3 submissions x 1000 views = 3000 total views`);
  console.log(`Expected earnings: 3000 / 1000 * 500 * (1 - 0.20) = 1200 cents = $12.00`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
