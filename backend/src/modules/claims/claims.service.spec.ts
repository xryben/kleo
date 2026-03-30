import { Test, TestingModule } from '@nestjs/testing';
import { ClaimsService } from './claims.service';
import { PrismaService } from '../../prisma.service';
import { getQueueToken } from '@nestjs/bull';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

describe('ClaimsService', () => {
  let service: ClaimsService;
  let prisma: Record<string, any>;
  let verificationQueue: { add: jest.Mock };

  beforeEach(async () => {
    prisma = {
      campaignClip: { findUnique: jest.fn() },
      clipClaim: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      clipSubmission: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    verificationQueue = { add: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaimsService,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken('clip-verification'), useValue: verificationQueue },
      ],
    }).compile();

    service = module.get<ClaimsService>(ClaimsService);
  });

  describe('create', () => {
    const clipperId = 'clipper-1';
    const dto = { campaignClipId: 'cc-1' };

    it('should throw NotFoundException if campaign clip not found', async () => {
      prisma.campaignClip.findUnique.mockResolvedValue(null);

      await expect(service.create(clipperId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if campaign is not active', async () => {
      prisma.campaignClip.findUnique.mockResolvedValue({
        id: 'cc-1',
        campaign: { status: 'DRAFT', userId: 'other-user' },
      });

      await expect(service.create(clipperId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if clipper owns the campaign', async () => {
      prisma.campaignClip.findUnique.mockResolvedValue({
        id: 'cc-1',
        campaign: { status: 'ACTIVE', userId: clipperId },
      });

      await expect(service.create(clipperId, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if clipper already has active claim', async () => {
      prisma.campaignClip.findUnique.mockResolvedValue({
        id: 'cc-1',
        campaign: { status: 'ACTIVE', userId: 'other-user' },
      });
      prisma.clipClaim.findFirst.mockResolvedValue({ id: 'existing-claim' });

      await expect(service.create(clipperId, dto)).rejects.toThrow(ConflictException);
    });

    it('should create a claim successfully', async () => {
      prisma.campaignClip.findUnique.mockResolvedValue({
        id: 'cc-1',
        campaign: { status: 'ACTIVE', userId: 'other-user' },
      });
      prisma.clipClaim.findFirst.mockResolvedValue(null);
      prisma.clipClaim.create.mockResolvedValue({
        id: 'claim-1',
        campaignClipId: 'cc-1',
        clipperId,
      });

      const result = await service.create(clipperId, dto);

      expect(result.id).toBe('claim-1');
      expect(prisma.clipClaim.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { campaignClipId: 'cc-1', clipperId },
        }),
      );
    });
  });

  describe('submit', () => {
    const claimId = 'claim-1';
    const clipperId = 'clipper-1';

    it('should throw NotFoundException if claim not found', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue(null);

      await expect(
        service.submit(claimId, clipperId, { socialUrl: 'https://www.tiktok.com/@u/video/123' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not the clipper', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId: 'other-clipper',
        status: 'CLAIMED',
        submissions: [],
      });

      await expect(
        service.submit(claimId, clipperId, { socialUrl: 'https://www.tiktok.com/@u/video/123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if not in CLAIMED status', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'SUBMITTED',
        submissions: [],
      });

      await expect(
        service.submit(claimId, clipperId, { socialUrl: 'https://www.tiktok.com/@u/video/123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if submission already exists for platform', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [{ platform: 'TIKTOK' }],
      });

      await expect(
        service.submit(claimId, clipperId, { socialUrl: 'https://www.tiktok.com/@u/video/123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for unsupported URL', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [],
      });

      await expect(
        service.submit(claimId, clipperId, { socialUrl: 'https://twitter.com/post/123' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create submission and queue verification on success', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [],
      });
      const mockSubmission = { id: 'sub-1' };
      prisma.$transaction.mockResolvedValue([mockSubmission, {}]);

      const result = await service.submit(claimId, clipperId, {
        socialUrl: 'https://www.tiktok.com/@user/video/123456',
      });

      expect(result.id).toBe('sub-1');
      expect(verificationQueue.add).toHaveBeenCalledWith(
        'verify-clip',
        { submissionId: 'sub-1' },
        expect.objectContaining({ attempts: 2, timeout: 300000 }),
      );
    });
  });

  describe('submitMulti', () => {
    const claimId = 'claim-1';
    const clipperId = 'clipper-1';

    it('should throw BadRequestException for duplicate platforms', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [],
      });

      await expect(
        service.submitMulti(claimId, clipperId, {
          urls: [
            { url: 'https://www.tiktok.com/@u/video/1', platform: 'TIKTOK' },
            { url: 'https://www.tiktok.com/@u/video/2', platform: 'TIKTOK' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if platform already submitted', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [{ platform: 'TIKTOK' }],
      });

      await expect(
        service.submitMulti(claimId, clipperId, {
          urls: [{ url: 'https://www.tiktok.com/@u/video/1', platform: 'TIKTOK' }],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if URL does not match platform', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [],
      });

      await expect(
        service.submitMulti(claimId, clipperId, {
          urls: [{ url: 'https://www.instagram.com/reel/ABC/', platform: 'TIKTOK' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create multiple submissions and queue verification for each', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue({
        id: claimId,
        clipperId,
        status: 'CLAIMED',
        submissions: [],
      });
      const mockSubs = [{ id: 'sub-1' }, { id: 'sub-2' }];
      prisma.$transaction.mockImplementation(async (fn: any) =>
        fn({
          clipSubmission: {
            create: jest.fn().mockResolvedValueOnce(mockSubs[0]).mockResolvedValueOnce(mockSubs[1]),
          },
          clipClaim: { update: jest.fn().mockResolvedValue({}) },
        }),
      );

      const result = await service.submitMulti(claimId, clipperId, {
        urls: [
          { url: 'https://www.tiktok.com/@u/video/123', platform: 'TIKTOK' },
          { url: 'https://www.instagram.com/reel/ABC/', platform: 'INSTAGRAM' },
        ],
      });

      expect(result).toHaveLength(2);
      expect(verificationQueue.add).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if claim not found', async () => {
      prisma.clipClaim.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return claim with includes', async () => {
      const mockClaim = { id: 'claim-1', campaignClip: {}, clipper: {}, submissions: [] };
      prisma.clipClaim.findUnique.mockResolvedValue(mockClaim);

      const result = await service.findOne('claim-1');
      expect(result.id).toBe('claim-1');
    });
  });
});
