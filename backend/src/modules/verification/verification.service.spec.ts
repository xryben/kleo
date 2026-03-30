import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VerificationService } from './verification.service';
import { PrismaService } from '../../prisma.service';
import { NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([]),
  rmSync: jest.fn(),
}));

jest.mock('child_process', () => ({
  execFileSync: jest.fn(),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: class MockPrismaClient {},
}));

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    (existsSync as jest.Mock).mockReturnValue(true);

    prisma = {
      clipSubmission: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      clipClaim: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const configGet = jest.fn((key: string) => {
      if (key === 'app.uploadsPath') return '/var/www/cleo/uploads';
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: configGet } },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);
  });

  describe('verifySubmission', () => {
    it('should throw NotFoundException if submission not found', async () => {
      prisma.clipSubmission.findUnique.mockResolvedValue(null);

      await expect(service.verifySubmission('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return no_match if clip has no watermark', async () => {
      prisma.clipSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        socialUrl: 'https://www.tiktok.com/@u/video/123',
        claim: {
          campaignClip: {
            clip: { id: 'clip-1', watermarks: [], filePath: '/tmp/clip.mp4' },
          },
        },
      });

      const result = await service.verifySubmission('sub-1');

      expect(result.verified).toBe(false);
      expect(result.method).toBe('no_match');
      expect(result.details).toContain('no watermark');
    });

    it('should return metadata_match if watermark found in metadata', async () => {
      const { execFileSync } = require('child_process');
      // First call: yt-dlp download (succeeds)
      (execFileSync as jest.Mock)
        .mockImplementationOnce(() => Buffer.from('')) // yt-dlp
        .mockImplementationOnce(() => Buffer.from('KLEO-uuid-123')); // ffprobe metadata

      prisma.clipSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        socialUrl: 'https://www.tiktok.com/@u/video/123',
        platform: 'TIKTOK',
        claim: {
          campaignClip: {
            clip: {
              id: 'clip-1',
              watermarks: [{ uuid: 'uuid-123' }],
              filePath: '/tmp/clip.mp4',
            },
          },
        },
      });

      // Mock file existence checks
      (existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.verifySubmission('sub-1');

      expect(result.verified).toBe(true);
      expect(result.method).toBe('metadata_match');
      expect(prisma.clipSubmission.update).toHaveBeenCalled();
    });

    it('should reject if download fails', async () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockImplementationOnce(() => {
        throw new Error('yt-dlp not found');
      });

      prisma.clipSubmission.findUnique.mockResolvedValue({
        id: 'sub-1',
        socialUrl: 'https://www.tiktok.com/@u/video/123',
        platform: 'TIKTOK',
        claimId: 'claim-1',
        claim: {
          campaignClip: {
            clip: {
              id: 'clip-1',
              watermarks: [{ uuid: 'uuid-123' }],
              filePath: '/tmp/clip.mp4',
            },
          },
        },
      });

      const result = await service.verifySubmission('sub-1');

      expect(result.verified).toBe(false);
      expect(result.details).toContain('Download failed');
    });
  });

  describe('hammingDistance (via comparePerceptualHash)', () => {
    it('should calculate hamming distance correctly', () => {
      // Access the private method via prototype
      const distance = (service as any).hammingDistance('0000', 'ffff');
      expect(distance).toBe(16); // 4 hex chars * 4 bits = all different

      const same = (service as any).hammingDistance('abcd', 'abcd');
      expect(same).toBe(0);

      const partial = (service as any).hammingDistance('0000', '000f');
      expect(partial).toBe(4); // only last hex digit differs: 0 vs f = 4 bits
    });
  });

  describe('checkMetadata (private)', () => {
    it('should return true when watermark text is in metadata', () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue(Buffer.from('some text KLEO-abc123 more text'));

      const result = (service as any).checkMetadata('/path/to/video.mp4', 'KLEO-abc123');
      expect(result).toBe(true);
    });

    it('should return false when watermark text is not in metadata', () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockReturnValue(Buffer.from('no watermark here'));

      const result = (service as any).checkMetadata('/path/to/video.mp4', 'KLEO-abc123');
      expect(result).toBe(false);
    });

    it('should return false when ffprobe fails', () => {
      const { execFileSync } = require('child_process');
      (execFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('ffprobe not found');
      });

      const result = (service as any).checkMetadata('/path/to/video.mp4', 'KLEO-abc123');
      expect(result).toBe(false);
    });
  });
});
