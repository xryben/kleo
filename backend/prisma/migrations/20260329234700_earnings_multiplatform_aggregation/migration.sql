-- AlterEnum
ALTER TYPE "CampaignStatus" ADD VALUE 'EXHAUSTED';

-- DropForeignKey
ALTER TABLE "earnings" DROP CONSTRAINT "earnings_submissionId_fkey";

-- DropIndex
DROP INDEX "clip_submissions_claimId_key";

-- DropIndex
DROP INDEX "earnings_submissionId_key";

-- AlterTable
ALTER TABLE "clip_claims" DROP COLUMN "platform",
ADD COLUMN     "earnedCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "flaggedForReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "payoutHoldUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "earnings" DROP COLUMN "submissionId",
ADD COLUMN     "claimId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "view_snapshots" ADD COLUMN     "flagReason" TEXT,
ADD COLUMN     "flagged" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "earning_adjustments" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "earning_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "earning_adjustments_claimId_idx" ON "earning_adjustments"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "clip_claims_campaignClipId_clipperId_key" ON "clip_claims"("campaignClipId", "clipperId");

-- CreateIndex
CREATE INDEX "clip_submissions_claimId_idx" ON "clip_submissions"("claimId");

-- CreateIndex
CREATE UNIQUE INDEX "clip_submissions_claimId_platform_key" ON "clip_submissions"("claimId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "earnings_claimId_key" ON "earnings"("claimId");

-- AddForeignKey
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "clip_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "earning_adjustments" ADD CONSTRAINT "earning_adjustments_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "clip_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

