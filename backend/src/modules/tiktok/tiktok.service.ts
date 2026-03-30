import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import axios from 'axios';
import { createReadStream, statSync } from 'fs';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TikTokService {
  private readonly logger = new Logger(TikTokService.name);

  constructor(private prisma: PrismaService) {}

  getAuthUrl(userId: string): string {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;
    if (!clientKey || !redirectUri) throw new BadRequestException('TikTok no configurado');

    const params = new URLSearchParams({
      client_key: clientKey,
      response_type: 'code',
      scope: 'user.info.basic,video.publish,video.upload',
      redirect_uri: redirectUri,
      state: userId,
    });
    return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
  }

  async handleCallback(code: string, userId: string) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;
    if (!clientKey || !clientSecret || !redirectUri) throw new BadRequestException('TikTok no configurado');

    // Exchange code for token
    const tokenRes = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const { access_token, refresh_token, expires_in, open_id } = tokenRes.data;

    // Get user info
    const userRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
      headers: { Authorization: `Bearer ${access_token}` },
      params: { fields: 'open_id,display_name' },
    });

    const username: string = userRes.data.data?.user?.display_name ?? 'TikTok User';
    const tokenExpires = new Date(Date.now() + expires_in * 1000);

    return this.prisma.tikTokAccount.upsert({
      where: { userId },
      create: { userId, openId: open_id, username, accessToken: access_token, refreshToken: refresh_token, tokenExpires },
      update: { openId: open_id, username, accessToken: access_token, refreshToken: refresh_token, tokenExpires },
    });
  }

  async getStatus(userId: string) {
    const account = await this.prisma.tikTokAccount.findUnique({ where: { userId } });
    if (!account) return { connected: false };
    return { connected: true, username: account.username, tokenExpires: account.tokenExpires };
  }

  async disconnect(userId: string) {
    await this.prisma.tikTokAccount.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async publishClip(videoPath: string, title: string, accessToken: string): Promise<string> {
    this.logger.log(`Uploading to TikTok: ${title}`);
    const fileSize = statSync(videoPath).size;

    // Step 1: Init upload
    const initRes = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        post_info: { title: title.slice(0, 150), privacy_level: 'PUBLIC_TO_EVERYONE', disable_duet: false, disable_stitch: false, disable_comment: false },
        source_info: { source: 'FILE_UPLOAD', video_size: fileSize, chunk_size: fileSize, total_chunk_count: 1 },
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } },
    );

    const { publish_id, upload_url } = initRes.data.data;

    // Step 2: Upload file
    await axios.put(upload_url, createReadStream(videoPath), {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
        'Content-Length': fileSize,
      },
    });

    this.logger.log(`TikTok upload complete, publish_id: ${publish_id}`);
    return publish_id as string;
  }
}
