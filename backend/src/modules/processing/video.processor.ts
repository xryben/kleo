import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ProcessingService } from './processing.service';

interface ProcessJob {
  projectId: string;
}

@Processor('video-processing')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(private processingService: ProcessingService) {}

  @Process('process')
  async handleProcess(job: Job<ProcessJob>) {
    const { projectId } = job.data;
    this.logger.log(`Processing project ${projectId} (attempt ${job.attemptsMade + 1})`);

    try {
      await this.processingService.processProject(projectId);
      this.logger.log(`Project ${projectId} processed successfully`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Project ${projectId} failed: ${msg}`);
      throw err;
    }
  }
}
