import { registerAs } from '@nestjs/config';

/** Business constants — change here, not scattered across services. */
export const PLATFORM_FEE_PERCENT = 20;
export const MIN_PAYOUT_CENTS = 2500; // $25
export const PAYOUT_HOLD_HOURS = 48;
export const MAX_FILE_SIZE_MB_DEFAULT = 500;

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT || '4002', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4003',
  uploadsPath: process.env.UPLOADS_PATH || '/var/www/cleo/uploads',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || String(MAX_FILE_SIZE_MB_DEFAULT), 10),
}));

export const authConfig = registerAs('auth', () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error('JWT_SECRET environment variable is required');
  return {
    jwtSecret,
    adminEmail: process.env.ADMIN_EMAIL,
  };
});

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

export const tiktokConfig = registerAs('tiktok', () => ({
  clientKey: process.env.TIKTOK_CLIENT_KEY,
  clientSecret: process.env.TIKTOK_CLIENT_SECRET,
  redirectUri: process.env.TIKTOK_REDIRECT_URI,
}));

export const youtubeConfig = registerAs('youtube', () => ({
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri: process.env.YOUTUBE_REDIRECT_URI,
}));

export const instagramConfig = registerAs('instagram', () => ({
  appId: process.env.INSTAGRAM_APP_ID,
  appSecret: process.env.INSTAGRAM_APP_SECRET,
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
}));

export const aiConfig = registerAs('ai', () => ({
  openaiApiKey: process.env.OPENAI_API_KEY,
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
}));
