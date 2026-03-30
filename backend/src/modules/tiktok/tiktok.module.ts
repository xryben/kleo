import { Module } from '@nestjs/common';
import { TikTokController } from './tiktok.controller';
import { TikTokService } from './tiktok.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [TikTokController],
  providers: [TikTokService, PrismaService],
  exports: [TikTokService],
})
export class TikTokModule {}
