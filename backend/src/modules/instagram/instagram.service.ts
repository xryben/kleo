import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);

  constructor(private prisma: PrismaService) {}

  getAuthUrl(): string {
    const appId = process.env.INSTAGRAM_APP_ID;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    if (!appId || !redirectUri) throw new BadRequestException('Instagram no configurado');

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      scope: 'instagram_basic,instagram_content_publish',
      response_type: 'code',
    });
    return `https://api.instagram.com/oauth/authorize?${params}`;
  }

  async handleCallback(code: string, userId: string) {
    const appId = process.env.INSTAGRAM_APP_ID;
    const appSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
    if (!appId || !appSecret || !redirectUri)
      throw new BadRequestException('Instagram no configurado');

    // Exchange code for short-lived token
    const tokenRes = await axios.post(
      'https://api.instagram.com/oauth/access_token',
      {
        client_id: appId,
        client_secret: appSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 10_000 },
    );

    const shortToken: string | undefined = tokenRes.data?.access_token;
    const igUserId: string | undefined = tokenRes.data?.user_id;
    if (!shortToken || !igUserId) throw new BadRequestException('Instagram token exchange failed');

    // Exchange for long-lived token (60 days)
    const longRes = await axios.get(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`,
      { timeout: 10_000 },
    );
    const longToken: string | undefined = longRes.data?.access_token;
    const expiresIn: number | undefined = longRes.data?.expires_in;
    if (!longToken || !expiresIn)
      throw new BadRequestException('Instagram long-lived token exchange failed');

    // Get username
    const profileRes = await axios.get(
      `https://graph.instagram.com/me?fields=username&access_token=${longToken}`,
      { timeout: 10_000 },
    );
    if (!profileRes.data?.username)
      throw new BadRequestException('Failed to retrieve Instagram username');

    return this.prisma.instagramAccount.upsert({
      where: { userId },
      create: {
        userId,
        igUserId,
        username: profileRes.data.username,
        accessToken: longToken,
        tokenExpires: new Date(Date.now() + expiresIn * 1000),
      },
      update: {
        igUserId,
        username: profileRes.data.username,
        accessToken: longToken,
        tokenExpires: new Date(Date.now() + expiresIn * 1000),
      },
    });
  }

  async getStatus(userId: string) {
    const account = await this.prisma.instagramAccount.findUnique({ where: { userId } });
    if (!account) return { connected: false };
    return {
      connected: true,
      username: account.username,
      tokenExpires: account.tokenExpires,
    };
  }

  async disconnect(userId: string) {
    await this.prisma.instagramAccount.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async publishClip(
    videoPath: string,
    caption: string,
    accessToken: string,
    igUserId: string,
  ): Promise<string> {
    // Step 1: Create media container
    const frontendUrl = process.env.FRONTEND_URL || 'https://cleo.skalex.pro';
    const videoUrl = `${frontendUrl}/api/v1/media/${encodeURIComponent(videoPath)}`;

    this.logger.log(`Creating IG container for ${videoPath}`);
    const containerRes = await axios.post(
      `https://graph.instagram.com/${igUserId}/media`,
      {
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        access_token: accessToken,
      },
      { timeout: 10_000 },
    );
    const containerId: string | undefined = containerRes.data?.id;
    if (!containerId) throw new Error('Failed to create IG media container');

    // Step 2: Wait for container to be ready
    await this.waitForContainer(containerId, accessToken);

    // Step 3: Publish
    const publishRes = await axios.post(
      `https://graph.instagram.com/${igUserId}/media_publish`,
      { creation_id: containerId, access_token: accessToken },
      { timeout: 10_000 },
    );

    const publishId: string | undefined = publishRes.data?.id;
    if (!publishId) throw new Error('Failed to publish IG media');
    return publishId;
  }

  private async waitForContainer(containerId: string, accessToken: string, maxRetries = 20) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      const res = await axios.get(
        `https://graph.instagram.com/${containerId}?fields=status_code&access_token=${accessToken}`,
        { timeout: 10_000 },
      );
      const statusCode = res.data?.status_code;
      if (statusCode === 'FINISHED') return;
      if (statusCode === 'ERROR') throw new Error('IG container processing failed');
    }
    throw new Error('IG container timeout');
  }
}
