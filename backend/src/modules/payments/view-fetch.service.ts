import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { SocialPlatform } from '@prisma/client';

@Injectable()
export class ViewFetchService {
  private readonly logger = new Logger(ViewFetchService.name);
  private readonly maxRequestsPerHour = 100;
  private readonly spacingMs = 2000;
  private readonly timeoutMs = 30000;

  private requestCount = 0;
  private windowStart = Date.now();
  private lastRequestAt = 0;

  async fetchViewCount(
    url: string,
    platform: SocialPlatform,
  ): Promise<number | null> {
    try {
      // Rate limiting: reset window every hour
      const now = Date.now();
      if (now - this.windowStart > 3600_000) {
        this.requestCount = 0;
        this.windowStart = now;
      }
      if (this.requestCount >= this.maxRequestsPerHour) {
        this.logger.warn('Rate limit reached, skipping fetch');
        return null;
      }

      // Enforce 2s spacing between requests
      const elapsed = now - this.lastRequestAt;
      if (elapsed < this.spacingMs) {
        await new Promise((r) => setTimeout(r, this.spacingMs - elapsed));
      }

      this.lastRequestAt = Date.now();
      this.requestCount++;

      const viewCount = await this.runYtDlp(url);
      this.logger.debug(
        `Fetched ${viewCount} views for ${platform} URL: ${url}`,
      );
      return viewCount;
    } catch (err) {
      this.logger.error(
        `Failed to fetch views for ${platform} (${url}): ${err}`,
      );
      return null;
    }
  }

  private runYtDlp(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      execFile(
        'yt-dlp',
        ['--dump-json', '--no-download', url],
        { timeout: this.timeoutMs },
        (error, stdout) => {
          if (error) {
            return reject(error);
          }
          try {
            const data = JSON.parse(stdout);
            const viewCount =
              typeof data.view_count === 'number' ? data.view_count : 0;
            resolve(viewCount);
          } catch (parseErr) {
            reject(new Error(`Failed to parse yt-dlp output: ${parseErr}`));
          }
        },
      );
    });
  }
}
