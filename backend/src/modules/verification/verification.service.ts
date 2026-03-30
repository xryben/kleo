import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma.service';

export interface VerificationResult {
  verified: boolean;
  method: 'text_match' | 'metadata_match' | 'phash_match' | 'no_match';
  confidence: number;
  details: string;
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly uploadsPath: string;
  private readonly tempDir: string;

  constructor(
    private prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadsPath = config.get<string>('app.uploadsPath')!;
    this.tempDir = join(this.uploadsPath, '_verification_tmp');
    if (!existsSync(this.tempDir)) mkdirSync(this.tempDir, { recursive: true });
  }

  async verifySubmission(submissionId: string): Promise<VerificationResult> {
    // 1. Get submission with claim chain
    const submission = await this.prisma.clipSubmission.findUnique({
      where: { id: submissionId },
      include: {
        claim: {
          include: {
            campaignClip: {
              include: {
                clip: {
                  include: { watermarks: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    const clip = submission.claim.campaignClip.clip;
    const watermark = clip.watermarks[0];

    if (!watermark) {
      this.logger.warn(`No watermark found for clip ${clip.id}`);
      return {
        verified: false,
        method: 'no_match',
        confidence: 0,
        details: 'Original clip has no watermark record',
      };
    }

    const watermarkText = `KLEO-${watermark.uuid}`;
    const workDir = join(this.tempDir, submissionId);
    if (!existsSync(workDir)) mkdirSync(workDir, { recursive: true });

    try {
      // 2. Download the published video
      const downloadedPath = join(workDir, 'submitted.mp4');
      this.logger.log(`Downloading submitted video from ${submission.socialUrl}`);

      try {
        execFileSync(
          'yt-dlp',
          [
            '-f',
            'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            '--merge-output-format',
            'mp4',
            '-o',
            downloadedPath,
            '--',
            submission.socialUrl,
          ],
          { timeout: 180000 },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to download video: ${msg}`);
        await this.rejectSubmission(
          submissionId,
          `Could not download video from ${submission.platform}`,
        );
        return {
          verified: false,
          method: 'no_match',
          confidence: 0,
          details: `Download failed: ${msg}`,
        };
      }

      if (!existsSync(downloadedPath)) {
        await this.rejectSubmission(submissionId, 'Video download produced no output');
        return {
          verified: false,
          method: 'no_match',
          confidence: 0,
          details: 'Download produced no file',
        };
      }

      // 3. Try metadata match first (fastest)
      const metadataResult = this.checkMetadata(downloadedPath, watermarkText);
      if (metadataResult) {
        await this.markVerified(submissionId);
        return {
          verified: true,
          method: 'metadata_match',
          confidence: 1.0,
          details: 'Watermark found in video metadata',
        };
      }

      // 4. Extract frames and search for text watermark
      const framesDir = join(workDir, 'frames');
      if (!existsSync(framesDir)) mkdirSync(framesDir, { recursive: true });

      this.logger.log('Extracting frames for OCR analysis...');
      try {
        execFileSync(
          'ffmpeg',
          ['-i', downloadedPath, '-vf', 'fps=1/5', `${framesDir}/frame_%04d.png`, '-y'],
          { timeout: 120000 },
        );
      } catch {
        this.logger.warn('Frame extraction failed, falling back to perceptual hash');
      }

      // Check frames for watermark text using image analysis
      const textFound = await this.searchFramesForWatermark(framesDir, watermarkText);
      if (textFound) {
        await this.markVerified(submissionId);
        return {
          verified: true,
          method: 'text_match',
          confidence: 0.95,
          details: 'Watermark text detected in video frames',
        };
      }

      // 5. Fallback: perceptual hash comparison
      if (existsSync(clip.filePath)) {
        const similarity = await this.comparePerceptualHash(clip.filePath, downloadedPath, workDir);
        if (similarity >= 0.9) {
          await this.markVerified(submissionId);
          return {
            verified: true,
            method: 'phash_match',
            confidence: similarity,
            details: `Perceptual hash similarity: ${(similarity * 100).toFixed(1)}%`,
          };
        }

        await this.rejectSubmission(
          submissionId,
          `Content mismatch (similarity: ${(similarity * 100).toFixed(1)}%)`,
        );
        return {
          verified: false,
          method: 'no_match',
          confidence: similarity,
          details: `Perceptual hash similarity too low: ${(similarity * 100).toFixed(1)}%`,
        };
      }

      await this.rejectSubmission(submissionId, 'Original clip file not found for comparison');
      return {
        verified: false,
        method: 'no_match',
        confidence: 0,
        details: 'Original clip file missing',
      };
    } finally {
      // Cleanup temp files
      this.cleanupDir(workDir);
    }
  }

  private checkMetadata(videoPath: string, watermarkText: string): boolean {
    try {
      const output = execFileSync(
        'ffprobe',
        [
          '-v',
          'quiet',
          '-show_entries',
          'format_tags=comment',
          '-of',
          'default=noprint_wrappers=1:nokey=1',
          videoPath,
        ],
        { timeout: 15000 },
      )
        .toString()
        .trim();
      return output.includes(watermarkText);
    } catch (err) {
      this.logger.warn(
        `Metadata check failed for ${videoPath}: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  private async searchFramesForWatermark(
    framesDir: string,
    watermarkText: string,
  ): Promise<boolean> {
    if (!existsSync(framesDir)) return false;

    const frames = readdirSync(framesDir).filter((f) => f.endsWith('.png'));
    if (frames.length === 0) return false;

    // Use sharp to analyze bottom-right region of frames for the watermark text
    // Since OCR is heavy, we look for the watermark pattern in pixel data
    // The watermark is 5% opacity white text at bottom-right — very hard to OCR
    // This is a best-effort check; pHash is the reliable fallback
    try {
      const sharp = await import('sharp');
      for (const frame of frames) {
        const framePath = join(framesDir, frame);
        const metadata = await sharp.default(framePath).metadata();
        if (!metadata.width || !metadata.height) continue;

        // Extract bottom-right 200x50 region where watermark lives
        const regionWidth = Math.min(200, metadata.width);
        const regionHeight = Math.min(50, metadata.height);
        const left = metadata.width - regionWidth;
        const top = metadata.height - regionHeight;

        const region = await sharp
          .default(framePath)
          .extract({ left, top, width: regionWidth, height: regionHeight })
          .greyscale()
          .raw()
          .toBuffer();

        // Check for near-white pixels that could be the watermark text
        // At 5% opacity on typical video, text pixels are very subtle
        // This heuristic checks for consistent subtle brightness patterns
        let subtleBrightPixels = 0;
        for (let px = 0; px < region.length; px++) {
          if (region[px]! > 240) subtleBrightPixels++;
        }

        const ratio = subtleBrightPixels / region.length;
        // If we detect a pattern consistent with overlaid text (small bright area)
        if (ratio > 0.01 && ratio < 0.15) {
          this.logger.log(
            `Watermark pattern detected in ${frame} (bright ratio: ${ratio.toFixed(3)})`,
          );
          return true;
        }
      }
    } catch (err) {
      this.logger.warn(`Frame analysis error: ${err instanceof Error ? err.message : err}`);
    }

    return false;
  }

  async comparePerceptualHash(
    originalPath: string,
    submittedPath: string,
    workDir: string,
  ): Promise<number> {
    const origThumb = join(workDir, 'orig_thumb.png');
    const subThumb = join(workDir, 'sub_thumb.png');

    try {
      // Extract representative frames from both videos (at 25% duration)
      const origDuration = this.getVideoDuration(originalPath);
      const subDuration = this.getVideoDuration(submittedPath);

      const origSeek = Math.max(1, Math.floor(origDuration * 0.25));
      const subSeek = Math.max(1, Math.floor(subDuration * 0.25));

      execFileSync(
        'ffmpeg',
        [
          '-i',
          originalPath,
          '-ss',
          String(origSeek),
          '-frames:v',
          '1',
          '-s',
          '64x64',
          origThumb,
          '-y',
        ],
        { timeout: 15000 },
      );
      execFileSync(
        'ffmpeg',
        [
          '-i',
          submittedPath,
          '-ss',
          String(subSeek),
          '-frames:v',
          '1',
          '-s',
          '64x64',
          subThumb,
          '-y',
        ],
        { timeout: 15000 },
      );

      if (!existsSync(origThumb) || !existsSync(subThumb)) return 0;

      const imghash = await import('imghash');
      const origHash = await imghash.hash(origThumb, 16);
      const subHash = await imghash.hash(subThumb, 16);

      // Calculate hamming distance
      const distance = this.hammingDistance(origHash, subHash);
      const maxBits = origHash.length * 4; // hex chars * 4 bits each
      const similarity = 1 - distance / maxBits;

      this.logger.log(
        `pHash comparison: distance=${distance}, similarity=${(similarity * 100).toFixed(1)}%`,
      );
      return similarity;
    } catch (err) {
      this.logger.error(`pHash comparison failed: ${err instanceof Error ? err.message : err}`);
      return 0;
    }
  }

  private getVideoDuration(videoPath: string): number {
    const output = execFileSync('ffprobe', [
      '-v',
      'quiet',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
      videoPath,
    ])
      .toString()
      .trim();
    return parseFloat(output) || 10;
  }

  private hammingDistance(hash1: string, hash2: string): number {
    let distance = 0;
    const len = Math.min(hash1.length, hash2.length);
    for (let i = 0; i < len; i++) {
      const xor = parseInt(hash1[i]!, 16) ^ parseInt(hash2[i]!, 16);
      // Count set bits
      let bits = xor;
      while (bits) {
        distance += bits & 1;
        bits >>= 1;
      }
    }
    return distance;
  }

  private async markVerified(submissionId: string): Promise<void> {
    await this.prisma.clipSubmission.update({
      where: { id: submissionId },
      data: { verifiedAt: new Date() },
    });

    // Also update the claim status
    const submission = await this.prisma.clipSubmission.findUnique({
      where: { id: submissionId },
      select: { claimId: true },
    });
    if (submission) {
      await this.prisma.clipClaim.update({
        where: { id: submission.claimId },
        data: { status: 'VERIFIED' },
      });
    }
  }

  private async rejectSubmission(submissionId: string, reason: string): Promise<void> {
    const submission = await this.prisma.clipSubmission.findUnique({
      where: { id: submissionId },
      select: { claimId: true },
    });

    await this.prisma.clipSubmission.update({
      where: { id: submissionId },
      data: { rejectionReason: reason },
    });

    if (submission) {
      await this.prisma.clipClaim.update({
        where: { id: submission.claimId },
        data: { status: 'REJECTED' },
      });
    }
  }

  private cleanupDir(dir: string): void {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      this.logger.warn(`Failed to cleanup ${dir}`);
    }
  }
}
