import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { VerificationProcessor } from './verification.processor';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'clip-verification',
    }),
  ],
  controllers: [VerificationController],
  providers: [VerificationService, VerificationProcessor, PrismaService],
  exports: [VerificationService],
})
export class VerificationModule {}
