-- CreateTable
CREATE TABLE "campaign_deposits" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_deposits_stripeSessionId_key" ON "campaign_deposits"("stripeSessionId");

-- CreateIndex
CREATE INDEX "campaign_deposits_campaignId_idx" ON "campaign_deposits"("campaignId");

-- AddForeignKey
ALTER TABLE "campaign_deposits" ADD CONSTRAINT "campaign_deposits_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
