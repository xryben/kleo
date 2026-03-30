import { ViewTrackingProcessor } from './view-tracking.processor';
import { PrismaService } from '../../prisma.service';
import { ViewFetchService } from './view-fetch.service';

describe('ViewTrackingProcessor', () => {
  let processor: ViewTrackingProcessor;
  let prisma: Record<string, any>;
  let viewFetch: { fetchViewCount: jest.Mock };

  beforeEach(() => {
    prisma = {
      clipClaim: { findMany: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      clipSubmission: { update: jest.fn().mockResolvedValue({}) },
      viewSnapshot: { create: jest.fn().mockResolvedValue({}) },
      earning: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
      earningAdjustment: { create: jest.fn().mockResolvedValue({}) },
      campaign: { update: jest.fn().mockResolvedValue({}) },
    };
    viewFetch = { fetchViewCount: jest.fn() };

    processor = new ViewTrackingProcessor(
      prisma as unknown as PrismaService,
      viewFetch as unknown as ViewFetchService,
    );
  });

  describe('detectFraud (private)', () => {
    it('should not flag with fewer than 2 snapshots', () => {
      const result = (processor as any).detectFraud(1000, 500, [500]);
      expect(result.flagged).toBe(false);
    });

    it('should not flag normal view growth', () => {
      // History: 100, 200, 300 (desc order) — deltas are 100 each
      const result = (processor as any).detectFraud(400, 300, [300, 200, 100]);
      expect(result.flagged).toBe(false);
    });

    it('should flag suspicious view spikes (>10x average delta)', () => {
      // History: 300, 200, 100 (desc) — deltas are 100 each, avg = 100
      // Current: 3500, previous: 300 — delta = 3200, which is 32x avg (>10x)
      const result = (processor as any).detectFraud(3500, 300, [300, 200, 100]);
      expect(result.flagged).toBe(true);
      expect(result.flagReason).toContain('View spike');
    });

    it('should not flag when views decrease', () => {
      const result = (processor as any).detectFraud(100, 200, [200, 150, 100]);
      expect(result.flagged).toBe(false);
    });

    it('should not flag when all historical deltas are zero or negative', () => {
      // History: 100, 100, 100 — deltas are all 0
      const result = (processor as any).detectFraud(200, 100, [100, 100, 100]);
      expect(result.flagged).toBe(false);
    });
  });

  describe('handleTrackViews', () => {
    const mockJob = { id: 'job-1' } as any;

    it('should process zero claims gracefully', async () => {
      prisma.clipClaim.findMany.mockResolvedValue([]);

      const result = await processor.handleTrackViews(mockJob);

      expect(result.processed).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should exhaust campaign when budget is spent', async () => {
      prisma.clipClaim.findMany.mockResolvedValue([
        {
          id: 'claim-1',
          flaggedForReview: false,
          earnedCents: 0,
          earning: null,
          clipper: { id: 'clipper-1' },
          submissions: [],
          campaignClip: {
            campaign: { id: 'camp-1', cpmCents: 500, budgetCents: 1000, spentCents: 1000 },
          },
        },
      ]);

      const result = await processor.handleTrackViews(mockJob);

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { status: 'EXHAUSTED' },
      });
      expect(result.exhausted).toBe(1);
    });

    it('should create earnings for new views on valid claim', async () => {
      viewFetch.fetchViewCount.mockResolvedValue(1500);

      prisma.clipClaim.findMany.mockResolvedValue([
        {
          id: 'claim-1',
          flaggedForReview: false,
          earnedCents: 0,
          earning: null,
          clipper: { id: 'clipper-1' },
          submissions: [
            {
              id: 'sub-1',
              socialUrl: 'https://tiktok.com/@u/video/1',
              platform: 'TIKTOK',
              viewCount: 1000,
              snapshots: [{ viewCount: 1000, checkedAt: new Date() }],
            },
          ],
          campaignClip: {
            campaign: { id: 'camp-1', cpmCents: 500, budgetCents: 100000, spentCents: 0 },
          },
        },
      ]);

      const result = await processor.handleTrackViews(mockJob);

      // 500 new views at $5 CPM = $2.50 gross, 80% net = $2.00
      expect(prisma.earning.create).toHaveBeenCalled();
      expect(result.processed).toBe(1);
    });

    it('should skip flagged claims for earnings', async () => {
      viewFetch.fetchViewCount.mockResolvedValue(2000);

      prisma.clipClaim.findMany.mockResolvedValue([
        {
          id: 'claim-1',
          flaggedForReview: true,
          earnedCents: 100,
          earning: { id: 'e-1', status: 'PENDING', amountCents: 100 },
          clipper: { id: 'clipper-1' },
          submissions: [
            {
              id: 'sub-1',
              socialUrl: 'https://tiktok.com/@u/video/1',
              platform: 'TIKTOK',
              viewCount: 1000,
              snapshots: [{ viewCount: 1000, checkedAt: new Date() }],
            },
          ],
          campaignClip: {
            campaign: { id: 'camp-1', cpmCents: 500, budgetCents: 100000, spentCents: 0 },
          },
        },
      ]);

      await processor.handleTrackViews(mockJob);

      expect(prisma.earning.create).not.toHaveBeenCalled();
      expect(prisma.earning.update).not.toHaveBeenCalled();
    });

    it('should flag claim when fraud detected', async () => {
      viewFetch.fetchViewCount.mockResolvedValue(50000);

      prisma.clipClaim.findMany.mockResolvedValue([
        {
          id: 'claim-1',
          flaggedForReview: false,
          earnedCents: 0,
          earning: null,
          clipper: { id: 'clipper-1' },
          submissions: [
            {
              id: 'sub-1',
              socialUrl: 'https://tiktok.com/@u/video/1',
              platform: 'TIKTOK',
              viewCount: 100,
              snapshots: [
                { viewCount: 100, checkedAt: new Date() },
                { viewCount: 90, checkedAt: new Date() },
                { viewCount: 80, checkedAt: new Date() },
              ],
            },
          ],
          campaignClip: {
            campaign: { id: 'camp-1', cpmCents: 500, budgetCents: 100000, spentCents: 0 },
          },
        },
      ]);

      await processor.handleTrackViews(mockJob);

      expect(prisma.clipClaim.update).toHaveBeenCalledWith({
        where: { id: 'claim-1' },
        data: { flaggedForReview: true },
      });
      // Should NOT create earnings for flagged claim
      expect(prisma.earning.create).not.toHaveBeenCalled();
    });

    it('should use stored viewCount as fallback when fetch fails', async () => {
      viewFetch.fetchViewCount.mockResolvedValue(null);

      prisma.clipClaim.findMany.mockResolvedValue([
        {
          id: 'claim-1',
          flaggedForReview: false,
          earnedCents: 0,
          earning: null,
          clipper: { id: 'clipper-1' },
          submissions: [
            {
              id: 'sub-1',
              socialUrl: 'https://tiktok.com/@u/video/1',
              platform: 'TIKTOK',
              viewCount: 1000,
              snapshots: [{ viewCount: 500, checkedAt: new Date() }],
            },
          ],
          campaignClip: {
            campaign: { id: 'camp-1', cpmCents: 500, budgetCents: 100000, spentCents: 0 },
          },
        },
      ]);

      await processor.handleTrackViews(mockJob);

      // Should use stored viewCount (1000) as fallback, not update submission
      expect(prisma.clipSubmission.update).toHaveBeenCalledTimes(1); // only lastViewCheck update
      expect(prisma.viewSnapshot.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ viewCount: 1000 }),
      });
    });
  });

  describe('handleViewDecrease (private)', () => {
    it('should not adjust if drop is <= 10%', async () => {
      await (processor as any).handleViewDecrease(
        {
          id: 'claim-1',
          earnedCents: 1000,
          earning: { id: 'e-1', status: 'PENDING', amountCents: 1000 },
        },
        {
          claimId: 'claim-1',
          campaignId: 'camp-1',
          cpmCents: 500,
          totalViews: 950,
          previousTotalViews: 1000,
          submissions: [],
        },
        0.2,
      );

      expect(prisma.earningAdjustment.create).not.toHaveBeenCalled();
    });

    it('should create adjustment and flag for review when drop > 10%', async () => {
      await (processor as any).handleViewDecrease(
        {
          id: 'claim-1',
          earnedCents: 1000,
          earning: { id: 'e-1', status: 'PENDING', amountCents: 1000 },
        },
        {
          claimId: 'claim-1',
          campaignId: 'camp-1',
          cpmCents: 500,
          totalViews: 500,
          previousTotalViews: 1000,
          submissions: [],
        },
        0.2,
      );

      expect(prisma.earningAdjustment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          claimId: 'claim-1',
          reason: expect.stringContaining('Bot purge'),
        }),
      });
      expect(prisma.clipClaim.update).toHaveBeenCalledWith({
        where: { id: 'claim-1' },
        data: expect.objectContaining({ flaggedForReview: true }),
      });
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: expect.objectContaining({ spentCents: expect.anything() }),
      });
    });
  });
});
