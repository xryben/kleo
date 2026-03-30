import { SocialPlatform } from '@prisma/client';

const PLATFORM_URL_PATTERNS: Record<SocialPlatform, RegExp> = {
  TIKTOK: /^https?:\/\/(www\.|vm\.)?tiktok\.com\//,
  INSTAGRAM: /^https?:\/\/(www\.)?instagram\.com\/(reel|p)\//,
  YOUTUBE: /^https?:\/\/(www\.|m\.)?(youtube\.com\/shorts\/|youtu\.be\/)/,
};

const POST_ID_EXTRACTORS: Record<SocialPlatform, RegExp> = {
  TIKTOK: /\/video\/(\d+)/,
  INSTAGRAM: /\/(reel|p)\/([A-Za-z0-9_-]+)/,
  YOUTUBE: /\/shorts\/([A-Za-z0-9_-]+)/,
};

export function validateUrlForPlatform(
  url: string,
  platform: SocialPlatform,
): boolean {
  return PLATFORM_URL_PATTERNS[platform].test(url);
}

export function extractExternalPostId(
  url: string,
  platform: SocialPlatform,
): string | null {
  const match = url.match(POST_ID_EXTRACTORS[platform]);
  if (!match) return null;

  if (platform === 'INSTAGRAM') {
    // Instagram regex has a capture group for reel/p prefix, post ID is group 2
    return match[2] ?? null;
  }
  return match[1] ?? null;
}
