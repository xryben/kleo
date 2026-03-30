import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { VerifySubmissionDto } from './dto/verify-submission.dto';

@Controller('verification')
@UseGuards(AuthGuard('jwt'))
export class VerificationController {
  constructor(
    @InjectQueue('clip-verification') private verificationQueue: Queue,
  ) {}

  @Post('verify')
  async verify(@Body() dto: VerifySubmissionDto) {
    const job = await this.verificationQueue.add('verify-clip', {
      submissionId: dto.submissionId,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      timeout: 300000, // 5 minutes
    });

    return {
      jobId: job.id,
      submissionId: dto.submissionId,
      status: 'queued',
      message: 'Verification job enqueued',
    };
  }
}
