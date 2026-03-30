import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { createReadStream } from 'fs';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class YouTubeService {
  private readonly logger = new Logger(YouTubeService.name);

  constructor(private prisma: PrismaService) {}

  getAuthUrl(userId: string): string {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('YouTube no configurado');
    }

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    return oauth2.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
      state: userId,
      prompt: 'consent',
    });
  }

  async handleCallback(code: string, userId: string) {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) throw new BadRequestException('YouTube no configurado');

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const yt = google.youtube({ version: 'v3', auth: oauth2 });
    const channelRes = await yt.channels.list({ part: ['snippet'], mine: true });
    const channel = channelRes.data.items?.[0];
    if (!channel) throw new BadRequestException('No se encontró el canal de YouTube');

    const tokenExpires = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000);

    return this.prisma.youTubeAccount.upsert({
      where: { userId },
      create: {
        userId,
        channelId: channel.id ?? '',
        channelName: channel.snippet?.title ?? '',
        accessToken: tokens.access_token ?? '',
        refreshToken: tokens.refresh_token ?? '',
        tokenExpires,
      },
      update: {
        channelId: channel.id ?? '',
        channelName: channel.snippet?.title ?? '',
        accessToken: tokens.access_token ?? '',
        refreshToken: tokens.refresh_token ?? (await this.getRefreshToken(userId)),
        tokenExpires,
      },
    });
  }

  async getStatus(userId: string) {
    const account = await this.prisma.youTubeAccount.findUnique({ where: { userId } });
    if (!account) return { connected: false };
    return { connected: true, channelName: account.channelName, tokenExpires: account.tokenExpires };
  }

  async disconnect(userId: string) {
    await this.prisma.youTubeAccount.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async publishClip(videoPath: string, title: string, description: string, accessToken: string, refreshToken: string): Promise<string> {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

    const yt = google.youtube({ version: 'v3', auth: oauth2 });

    this.logger.log(`Uploading to YouTube Shorts: ${title}`);
    const res = await yt.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: `${title} #Shorts`,
          description: `${description}\n\n#Shorts`,
          tags: ['shorts', 'viral'],
          categoryId: '22',
        },
        status: { privacyStatus: 'public' },
      },
      media: {
        mimeType: 'video/mp4',
        body: createReadStream(videoPath),
      },
    });

    return res.data.id ?? '';
  }

  private async getRefreshToken(userId: string): Promise<string> {
    const account = await this.prisma.youTubeAccount.findUnique({ where: { userId } });
    return account?.refreshToken ?? '';
  }
}
