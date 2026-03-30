import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { VerificationService } from './verification.service';

interface VerifyClipJob {
  submissionId: string;
}

@Processor('clip-verification')
export class VerificationProcessor {
  private readonly logger = new Logger(VerificationProcessor.name);

  constructor(private verificationService: VerificationService) {}

  @Process('verify-clip')
  async handleVerification(job: Job<VerifyClipJob>) {
    const { submissionId } = job.data;
    this.logger.log(`Verifying submission ${submissionId} (attempt ${job.attemptsMade + 1})`);

    try {
      const result = await this.verificationService.verifySubmission(submissionId);
      this.logger.log(
        `Submission ${submissionId}: ${result.verified ? 'VERIFIED' : 'REJECTED'} via ${result.method} (confidence: ${result.confidence})`,
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Verification failed for ${submissionId}: ${msg}`);
      throw err;
    }
  }
}
