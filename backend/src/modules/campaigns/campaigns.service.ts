import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/create-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        userId,
        tenantId,
        title: dto.title,
        description: dto.description,
        budgetCents: dto.budgetCents,
        cpmCents: dto.cpmCents,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { clips: { include: { clip: true } } },
    });
  }

  async findAllByOwner(userId: string, tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { userId, tenantId },
      include: {
        clips: { include: { clip: true } },
        _count: { select: { clips: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPublicActive() {
    return this.prisma.campaign.findMany({
      where: { status: CampaignStatus.ACTIVE },
      include: {
        clips: {
          where: { isPublic: true },
          include: { clip: true },
        },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        clips: {
          include: {
            clip: true,
            claims: { include: { clipper: { select: { id: true, name: true } } } },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async update(id: string, userId: string, tenantId: string, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId || campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Not the campaign owner');
    }

    if (dto.status === CampaignStatus.ACTIVE && campaign.budgetCents <= 0 && !dto.budgetCents) {
      throw new BadRequestException('Campaign must have budget > 0 to be ACTIVE');
    }

    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { clips: { include: { clip: true } } },
    });
  }

  async addClips(campaignId: string, userId: string, tenantId: string, clipIds: string[]) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId || campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Not the campaign owner');
    }

    // Verify clips belong to the same tenant
    const clips = await this.prisma.clip.findMany({
      where: { id: { in: clipIds } },
      include: { project: { select: { tenantId: true } } },
    });
    const invalidClips = clips.filter((c) => c.project.tenantId !== tenantId);
    if (invalidClips.length > 0) {
      throw new ForbiddenException('Some clips do not belong to your tenant');
    }

    const data = clipIds.map((clipId) => ({
      campaignId,
      clipId,
      isPublic: true,
    }));

    await this.prisma.campaignClip.createMany({
      data,
      skipDuplicates: true,
    });

    return this.findOne(campaignId);
  }

  async removeClip(campaignId: string, clipId: string, userId: string, tenantId: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.userId !== userId || campaign.tenantId !== tenantId) {
      throw new ForbiddenException('Not the campaign owner');
    }

    const campaignClip = await this.prisma.campaignClip.findUnique({
      where: { campaignId_clipId: { campaignId, clipId } },
    });
    if (!campaignClip) throw new NotFoundException('Clip not in campaign');

    await this.prisma.campaignClip.delete({
      where: { id: campaignClip.id },
    });

    return { message: 'Clip removed from campaign' };
  }
}
