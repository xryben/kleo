/*
  Warnings:

  - You are about to drop the column `igPostId` on the `clips` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `clips` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `clips` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('PENDING', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- AlterTable
ALTER TABLE "clips" DROP COLUMN "igPostId",
DROP COLUMN "publishedAt",
DROP COLUMN "status";

-- DropEnum
DROP TYPE "ClipStatus";

-- CreateTable
CREATE TABLE "social_publishes" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "status" "PublishStatus" NOT NULL DEFAULT 'PENDING',
    "postId" TEXT,
    "postUrl" TEXT,
    "error" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_publishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiktok_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenExpires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tiktok_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_publishes_clipId_platform_key" ON "social_publishes"("clipId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_accounts_userId_key" ON "youtube_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tiktok_accounts_userId_key" ON "tiktok_accounts"("userId");

-- AddForeignKey
ALTER TABLE "social_publishes" ADD CONSTRAINT "social_publishes_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_accounts" ADD CONSTRAINT "youtube_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tiktok_accounts" ADD CONSTRAINT "tiktok_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
