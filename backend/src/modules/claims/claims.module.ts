import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'clip-verification' }),
  ],
  controllers: [ClaimsController],
  providers: [ClaimsService, PrismaService],
  exports: [ClaimsService],
})
export class ClaimsModule {}
