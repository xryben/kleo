import { Module } from '@nestjs/common';
import { ClipsController } from './clips.controller';
import { ClipsService } from './clips.service';
import { InstagramModule } from '../instagram/instagram.module';
import { YouTubeModule } from '../youtube/youtube.module';
import { TikTokModule } from '../tiktok/tiktok.module';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [InstagramModule, YouTubeModule, TikTokModule],
  controllers: [ClipsController],
  providers: [ClipsService, PrismaService],
})
export class ClipsModule {}
