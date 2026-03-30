import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ProcessingService } from './processing.service';
import { VideoProcessor } from './video.processor';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'video-processing' })],
  providers: [ProcessingService, VideoProcessor, PrismaService],
  exports: [ProcessingService],
})
export class ProcessingModule {}
