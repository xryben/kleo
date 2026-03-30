import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import axios from 'axios';
import { PrismaService } from '../../prisma.service';

interface ClipMoment {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
}

@Injectable()
export class ProcessingService {
  private readonly logger = new Logger(ProcessingService.name);
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  private uploadsPath = process.env.UPLOADS_PATH || '/var/www/cleo/uploads';

  constructor(private prisma: PrismaService) {}

  async processProject(projectId: string): Promise<void> {
    const project = await this.prisma.videoProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error(`Project ${projectId} not found`);

    const projectDir = join(this.uploadsPath, projectId);
    if (!existsSync(projectDir)) mkdirSync(projectDir, { recursive: true });

    try {
      // Step 1: Download or move source video
      await this.updateStatus(projectId, 'DOWNLOADING');
      const sourcePath = await this.prepareSource(project, projectDir);

      // Step 2: Get video duration
      const duration = this.getVideoDuration(sourcePath);
      await this.prisma.videoProject.update({
        where: { id: projectId },
        data: { duration },
      });

      // Step 3: Transcribe
      await this.updateStatus(projectId, 'TRANSCRIBING');
      const transcript = await this.transcribe(sourcePath, projectDir);
      await this.prisma.videoProject.update({
        where: { id: projectId },
        data: { transcript },
      });

      // Step 4: Analyze with AI
      await this.updateStatus(projectId, 'ANALYZING');
      const moments = await this.analyzeTranscript(transcript, duration);

      // Step 5: Cut clips
      await this.updateStatus(projectId, 'CUTTING');
      await this.cutClips(projectId, sourcePath, moments, projectDir);

      await this.updateStatus(projectId, 'READY');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Processing failed for ${projectId}: ${msg}`);
      await this.prisma.videoProject.update({
        where: { id: projectId },
        data: { status: 'FAILED', error: msg },
      });
      throw err;
    }
  }

  private async prepareSource(
    project: { id: string; sourceType: string; sourceUrl: string | null; localPath: string | null },
    projectDir: string,
  ): Promise<string> {
    const sourcePath = join(projectDir, 'source.mp4');

    if (project.sourceType === 'YOUTUBE') {
      if (!project.sourceUrl) throw new Error('sourceUrl requerida para YouTube');
      // Validate URL to prevent command injection
      try {
        const parsed = new URL(project.sourceUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid URL protocol');
        }
      } catch (err) {
        this.logger.warn(
          `Invalid sourceUrl "${project.sourceUrl}": ${err instanceof Error ? err.message : err}`,
        );
        throw new Error('sourceUrl inválida');
      }
      this.logger.log(`Downloading YouTube: ${project.sourceUrl}`);
      execFileSync(
        'yt-dlp',
        [
          '-f',
          'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
          '--merge-output-format',
          'mp4',
          '-o',
          sourcePath,
          project.sourceUrl,
        ],
        { timeout: 300000 },
      );
    } else {
      if (!project.localPath) throw new Error('localPath requerida para UPLOAD');
      copyFileSync(project.localPath, sourcePath);
    }

    if (!existsSync(sourcePath)) throw new Error('No se pudo obtener el video fuente');
    return sourcePath;
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
    return parseFloat(output);
  }

  private async transcribe(videoPath: string, projectDir: string): Promise<string> {
    const audioPath = join(projectDir, 'audio.mp3');
    this.logger.log('Extracting audio...');
    execFileSync('ffmpeg', [
      '-i',
      videoPath,
      '-vn',
      '-acodec',
      'libmp3lame',
      '-ar',
      '16000',
      '-ac',
      '1',
      audioPath,
      '-y',
    ]);

    this.logger.log('Transcribing with Whisper...');
    const { createReadStream } = await import('fs');
    const response = await this.openai.audio.transcriptions.create({
      file: createReadStream(audioPath) as unknown as File,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return typeof response === 'string' ? response : (response as { text: string }).text;
  }

  private async analyzeTranscript(transcript: string, duration: number): Promise<ClipMoment[]> {
    const prompt = `Analiza esta transcripción de video y encuentra los mejores momentos para clips virales de redes sociales (Instagram Reels, TikTok).

Transcripción:
${transcript.slice(0, 8000)}

Duración total del video: ${Math.round(duration)} segundos

Reglas:
- Cada clip máximo 59 segundos
- Busca momentos con: insights valiosos, humor, revelaciones, consejos prácticos, momentos emotivos
- Genera entre 3 y 8 clips
- Los tiempos deben estar dentro de [0, ${Math.round(duration)}]
- Asegúrate que startTime < endTime y endTime - startTime <= 59

Responde SOLO con JSON válido, sin markdown:
{"clips": [{"title": "Título corto y llamativo", "description": "Caption para Instagram con emojis", "startTime": 10.5, "endTime": 65.2}]}`;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY no configurada');

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 30_000,
      },
    );

    const content: string | undefined = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI model');
    const cleaned = content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const parsed = JSON.parse(cleaned) as { clips: ClipMoment[] };

    return parsed.clips.filter(
      (c) => c.startTime >= 0 && c.endTime <= duration && c.endTime - c.startTime <= 59,
    );
  }

  private async cutClips(
    projectId: string,
    sourcePath: string,
    moments: ClipMoment[],
    projectDir: string,
  ): Promise<void> {
    const clipsDir = join(projectDir, 'clips');
    if (!existsSync(clipsDir)) mkdirSync(clipsDir, { recursive: true });

    for (let i = 0; i < moments.length; i++) {
      const moment = moments[i]!;
      const clipPath = join(clipsDir, `clip_${i + 1}.mp4`);
      const thumbPath = join(clipsDir, `thumb_${i + 1}.jpg`);
      const clipDuration = moment.endTime - moment.startTime;

      this.logger.log(`Cutting clip ${i + 1}: ${moment.startTime}s - ${moment.endTime}s`);

      // Cut the raw clip
      const rawClipPath = join(clipsDir, `clip_${i + 1}_raw.mp4`);
      execFileSync(
        'ffmpeg',
        [
          '-i',
          sourcePath,
          '-ss',
          String(moment.startTime),
          '-t',
          String(clipDuration),
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-preset',
          'fast',
          rawClipPath,
          '-y',
        ],
        { timeout: 120000 },
      );

      // Watermark: embed unique KLEO-{uuid} text overlay
      const watermarkUuid = randomUUID();
      const watermarkText = `KLEO-${watermarkUuid}`;
      this.logger.log(`Watermarking clip ${i + 1} with ${watermarkText}`);

      // Escape special characters for ffmpeg drawtext filter
      const escapedWatermark = watermarkText.replace(/[:'\\]/g, '\\$&');
      execFileSync(
        'ffmpeg',
        [
          '-i',
          rawClipPath,
          '-vf',
          `drawtext=text='${escapedWatermark}':fontsize=8:fontcolor=white@0.05:x=w-tw-10:y=h-th-10`,
          '-metadata',
          `comment=${watermarkText}`,
          '-c:v',
          'libx264',
          '-c:a',
          'aac',
          '-preset',
          'fast',
          clipPath,
          '-y',
        ],
        { timeout: 120000 },
      );

      // Clean up raw clip
      if (existsSync(rawClipPath)) {
        try {
          unlinkSync(rawClipPath);
        } catch (err) {
          this.logger.warn(
            `Failed to remove raw clip ${rawClipPath}: ${err instanceof Error ? err.message : err}`,
          );
        }
      }

      // Thumbnail
      execFileSync('ffmpeg', ['-i', clipPath, '-ss', '1', '-frames:v', '1', thumbPath, '-y'], {
        timeout: 30000,
      });

      const clip = await this.prisma.clip.create({
        data: {
          projectId,
          title: moment.title,
          description: moment.description,
          startTime: moment.startTime,
          endTime: moment.endTime,
          duration: clipDuration,
          filePath: clipPath,
          thumbnail: existsSync(thumbPath) ? thumbPath : null,
        },
      });

      // Save watermark record
      await this.prisma.clipWatermark.create({
        data: {
          clipId: clip.id,
          uuid: watermarkUuid,
          method: 'TEXT_OVERLAY',
        },
      });
    }
  }

  private async updateStatus(projectId: string, status: string): Promise<void> {
    await this.prisma.videoProject.update({
      where: { id: projectId },
      data: {
        status: status as Parameters<typeof this.prisma.videoProject.update>[0]['data']['status'],
      },
    });
  }
}
