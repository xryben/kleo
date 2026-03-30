import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class PaymentsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsSchedulerService.name);

  constructor(
    @InjectQueue('view-tracking') private viewTrackingQueue: Queue,
    @InjectQueue('payout-processing') private payoutQueue: Queue,
  ) {}

  async onModuleInit() {
    // Clean existing repeatable jobs before adding new ones
    const existingViewJobs = await this.viewTrackingQueue.getRepeatableJobs();
    for (const job of existingViewJobs) {
      await this.viewTrackingQueue.removeRepeatableByKey(job.key);
    }

    const existingPayoutJobs = await this.payoutQueue.getRepeatableJobs();
    for (const job of existingPayoutJobs) {
      await this.payoutQueue.removeRepeatableByKey(job.key);
    }

    // View tracking: every 6 hours
    await this.viewTrackingQueue.add(
      'track-views',
      {},
      { repeat: { cron: '0 */6 * * *' }, removeOnComplete: 10 },
    );
    this.logger.log('Scheduled view-tracking job (every 6 hours)');

    // Payout processing: every 24 hours at midnight UTC
    await this.payoutQueue.add(
      'process-payouts',
      {},
      { repeat: { cron: '0 0 * * *' }, removeOnComplete: 10 },
    );
    this.logger.log('Scheduled payout-processing job (daily at midnight UTC)');
  }
}
