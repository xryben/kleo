import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { resolve } from 'path';
import { Response } from 'express';
import { SocialPlatform } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { InstagramService } from '../instagram/instagram.service';
import { YouTubeService } from '../youtube/youtube.service';
import { TikTokService } from '../tiktok/tiktok.service';

@Injectable()
export class ClipsService {
  private readonly uploadsPath = resolve(process.env.UPLOADS_PATH || '/var/www/cleo/uploads');

  constructor(
    private prisma: PrismaService,
    private instagram: InstagramService,
    private youtube: YouTubeService,
    private tiktok: TikTokService,
  ) {}

  private validateFilePath(filePath: string): string {
    const resolved = resolve(filePath);
    if (!resolved.startsWith(this.uploadsPath + '/') && resolved !== this.uploadsPath) {
      throw new ForbiddenException('File path outside uploads directory');
    }
    return resolved;
  }

  async findOne(id: string, tenantId: string) {
    const clip = await this.prisma.clip.findUnique({
      where: { id },
      include: { project: true, publishes: true },
    });
    if (!clip) throw new NotFoundException('Clip no encontrado');
    if (clip.project.tenantId !== tenantId) throw new ForbiddenException();
    return clip;
  }

  async stream(id: string, tenantId: string, res: Response) {
    const clip = await this.findOne(id, tenantId);
    const safePath = this.validateFilePath(clip.filePath);
    if (!existsSync(safePath)) throw new NotFoundException('Archivo no encontrado');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    createReadStream(safePath).pipe(res);
  }

  async publish(id: string, tenantId: string, platform: SocialPlatform) {
    const clip = await this.findOne(id, tenantId);
    const safePath = this.validateFilePath(clip.filePath);

    // Get owner userId
    const project = await this.prisma.videoProject.findUnique({
      where: { id: clip.projectId },
      select: { userId: true },
    });
    if (!project) throw new NotFoundException();
    const userId = project.userId;

    // Check if already published to this platform
    const existing = clip.publishes.find((p) => p.platform === platform);
    if (existing?.status === 'PUBLISHED') {
      throw new BadRequestException(`Ya publicado en ${platform}`);
    }

    // Upsert publish record → PUBLISHING
    const publish = await this.prisma.socialPublish.upsert({
      where: { clipId_platform: { clipId: id, platform } },
      create: { clipId: id, platform, status: 'PUBLISHING' },
      update: { status: 'PUBLISHING', error: null },
    });

    try {
      let postId = '';

      if (platform === 'INSTAGRAM') {
        const account = await this.prisma.instagramAccount.findUnique({ where: { userId } });
        if (!account) throw new BadRequestException('Instagram no conectado');
        postId = await this.instagram.publishClip(
          safePath,
          clip.description ?? clip.title,
          account.accessToken,
          account.igUserId,
        );

      } else if (platform === 'YOUTUBE') {
        const account = await this.prisma.youTubeAccount.findUnique({ where: { userId } });
        if (!account) throw new BadRequestException('YouTube no conectado');
        postId = await this.youtube.publishClip(
          safePath,
          clip.title,
          clip.description ?? '',
          account.accessToken,
          account.refreshToken,
        );

      } else if (platform === 'TIKTOK') {
        const account = await this.prisma.tikTokAccount.findUnique({ where: { userId } });
        if (!account) throw new BadRequestException('TikTok no conectado');
        postId = await this.tiktok.publishClip(
          safePath,
          clip.title,
          account.accessToken,
        );
      }

      return this.prisma.socialPublish.update({
        where: { id: publish.id },
        data: { status: 'PUBLISHED', postId, publishedAt: new Date() },
      });

    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await this.prisma.socialPublish.update({
        where: { id: publish.id },
        data: { status: 'FAILED', error },
      });
      throw err;
    }
  }

  async remove(id: string, tenantId: string) {
    const clip = await this.findOne(id, tenantId);
    await this.prisma.clip.delete({ where: { id: clip.id } });
    return { ok: true };
  }
}
