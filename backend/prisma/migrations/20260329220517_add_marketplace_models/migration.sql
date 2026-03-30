-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('INFOPRODUCTOR', 'CLIPPER', 'BOTH');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('CLAIMED', 'SUBMITTED', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WatermarkMethod" AS ENUM ('TEXT_OVERLAY', 'METADATA', 'PERCEPTUAL_HASH');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "userType" "UserType" NOT NULL DEFAULT 'INFOPRODUCTOR';

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "budgetCents" INTEGER NOT NULL,
    "cpmCents" INTEGER NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "spentCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_clips" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_claims" (
    "id" TEXT NOT NULL,
    "campaignClipId" TEXT NOT NULL,
    "clipperId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'CLAIMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_submissions" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "socialUrl" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "externalPostId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewCheck" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_snapshots" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "earnings" (
    "id" TEXT NOT NULL,
    "clipperId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "clipperId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "stripeTransferId" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clip_watermarks" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "method" "WatermarkMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clip_watermarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaigns_tenantId_idx" ON "campaigns"("tenantId");

-- CreateIndex
CREATE INDEX "campaigns_userId_idx" ON "campaigns"("userId");

-- CreateIndex
CREATE INDEX "campaigns_status_idx" ON "campaigns"("status");

-- CreateIndex
CREATE INDEX "campaign_clips_clipId_idx" ON "campaign_clips"("clipId");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_clips_campaignId_clipId_key" ON "campaign_clips"("campaignId", "clipId");

-- CreateIndex
CREATE INDEX "clip_claims_campaignClipId_idx" ON "clip_claims"("campaignClipId");

-- CreateIndex
CREATE INDEX "clip_claims_clipperId_idx" ON "clip_claims"("clipperId");

-- CreateIndex
CREATE INDEX "clip_claims_status_idx" ON "clip_claims"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clip_submissions_claimId_key" ON "clip_submissions"("claimId");

-- CreateIndex
CREATE INDEX "clip_submissions_platform_idx" ON "clip_submissions"("platform");

-- CreateIndex
CREATE INDEX "view_snapshots_submissionId_idx" ON "view_snapshots"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_submissionId_key" ON "earnings"("submissionId");

-- CreateIndex
CREATE INDEX "earnings_clipperId_idx" ON "earnings"("clipperId");

-- CreateIndex
CREATE INDEX "earnings_status_idx" ON "earnings"("status");

-- CreateIndex
CREATE INDEX "payouts_clipperId_idx" ON "payouts"("clipperId");

-- CreateIndex
CREATE INDEX "payouts_status_idx" ON "payouts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clip_watermarks_uuid_key" ON "clip_watermarks"("uuid");

-- CreateIndex
CREATE INDEX "clip_watermarks_clipId_idx" ON "clip_watermarks"("clipId");

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_clips" ADD CONSTRAINT "campaign_clips_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_clips" ADD CONSTRAINT "campaign_clips_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_claims" ADD CONSTRAINT "clip_claims_campaignClipId_fkey" FOREIGN KEY ("campaignClipId") REFERENCES "campaign_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_claims" ADD CONSTRAINT "clip_claims_clipperId_fkey" FOREIGN KEY ("clipperId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_submissions" ADD CONSTRAINT "clip_submissions_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "clip_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "view_snapshots" ADD CONSTRAINT "view_snapshots_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "clip_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_clipperId_fkey" FOREIGN KEY ("clipperId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "clip_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_clipperId_fkey" FOREIGN KEY ("clipperId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clip_watermarks" ADD CONSTRAINT "clip_watermarks_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
