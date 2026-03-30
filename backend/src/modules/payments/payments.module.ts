import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { ViewTrackingProcessor } from './view-tracking.processor';
import { ViewFetchService } from './view-fetch.service';
import { PayoutProcessor } from './payout.processor';
import { PaymentsSchedulerService } from './payments-scheduler.service';
import { PrismaService } from '../../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'view-tracking' }),
    BullModule.registerQueue({ name: 'payout-processing' }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ViewTrackingProcessor,
    ViewFetchService,
    PayoutProcessor,
    PaymentsSchedulerService,
    PrismaService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
