import { Module } from '@nestjs/common';
import { YouTubeController } from './youtube.controller';
import { YouTubeService } from './youtube.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [YouTubeController],
  providers: [YouTubeService, PrismaService],
  exports: [YouTubeService],
})
export class YouTubeModule {}
