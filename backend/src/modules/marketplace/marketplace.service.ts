import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async findAvailableClips(filters?: {
    platform?: string;
    minCpm?: number;
    maxCpm?: number;
    page?: number;
    limit?: number;
  }) {
    const take = Math.min(filters?.limit || 20, 100);
    const skip = ((filters?.page || 1) - 1) * take;

    const cpmFilter: any = {};
    if (filters?.minCpm) cpmFilter.gte = filters.minCpm;
    if (filters?.maxCpm) cpmFilter.lte = filters.maxCpm;

    const campaignFilter: any = { status: CampaignStatus.ACTIVE };
    if (Object.keys(cpmFilter).length > 0) {
      campaignFilter.cpmCents = cpmFilter;
    }

    const where = {
      isPublic: true,
      campaign: campaignFilter,
    };

    const [data, total] = await Promise.all([
      this.prisma.campaignClip.findMany({
        where,
        include: {
          clip: {
            select: {
              id: true,
              title: true,
              description: true,
              duration: true,
              thumbnail: true,
            },
          },
          campaign: {
            select: {
              id: true,
              title: true,
              cpmCents: true,
              user: { select: { id: true, name: true } },
            },
          },
          _count: { select: { claims: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.campaignClip.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: filters?.page || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  async findClipDetail(clipId: string) {
    const campaignClips = await this.prisma.campaignClip.findMany({
      where: {
        clipId,
        isPublic: true,
        campaign: { status: CampaignStatus.ACTIVE },
      },
      include: {
        clip: {
          select: {
            id: true,
            projectId: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            duration: true,
            thumbnail: true,
            createdAt: true,
          },
        },
        campaign: {
          select: {
            id: true,
            title: true,
            description: true,
            cpmCents: true,
            user: { select: { id: true, name: true } },
          },
        },
        _count: { select: { claims: true } },
      },
    });

    if (campaignClips.length === 0) {
      throw new NotFoundException('Clip not found in any active campaign');
    }

    // Return clip info with all active campaigns it belongs to
    const clip = campaignClips[0]!.clip;
    return {
      ...clip,
      campaigns: campaignClips.map((cc) => ({
        campaignClipId: cc.id,
        campaign: cc.campaign,
        claimCount: cc._count.claims,
      })),
    };
  }
}
