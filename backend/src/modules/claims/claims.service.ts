import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma.service';
import {
  CreateClaimDto,
  SubmitClaimDto,
  SubmitClaimMultiDto,
} from './dto/create-claim.dto';
import { ClaimStatus, CampaignStatus, SocialPlatform } from '@prisma/client';
import {
  validateUrlForPlatform,
  extractExternalPostId,
} from './url-utils';

@Injectable()
export class ClaimsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('clip-verification') private verificationQueue: Queue,
  ) {}

  async create(clipperId: string, dto: CreateClaimDto) {
    // Verify campaign clip exists and campaign is active
    const campaignClip = await this.prisma.campaignClip.findUnique({
      where: { id: dto.campaignClipId },
      include: { campaign: true },
    });
    if (!campaignClip) throw new NotFoundException('Campaign clip not found');
    if (campaignClip.campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }
    if (campaignClip.campaign.userId === clipperId) {
      throw new ForbiddenException('Cannot claim clips from your own campaign');
    }

    // Check for existing active claim by same clipper on same campaign clip
    const existing = await this.prisma.clipClaim.findFirst({
      where: {
        campaignClipId: dto.campaignClipId,
        clipperId,
        status: { in: [ClaimStatus.CLAIMED, ClaimStatus.SUBMITTED] },
      },
    });
    if (existing) {
      throw new ConflictException('You already have an active claim for this clip');
    }

    return this.prisma.clipClaim.create({
      data: {
        campaignClipId: dto.campaignClipId,
        clipperId,
      },
      include: {
        campaignClip: { include: { clip: true, campaign: { select: { id: true, title: true, cpmCents: true } } } },
      },
    });
  }

  async findAllByClipper(clipperId: string) {
    return this.prisma.clipClaim.findMany({
      where: { clipperId },
      include: {
        campaignClip: {
          include: {
            clip: true,
            campaign: { select: { id: true, title: true, cpmCents: true } },
          },
        },
        submissions: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const claim = await this.prisma.clipClaim.findUnique({
      where: { id },
      include: {
        campaignClip: {
          include: {
            clip: true,
            campaign: { select: { id: true, title: true, cpmCents: true, status: true, userId: true } },
          },
        },
        clipper: { select: { id: true, name: true } },
        submissions: true,
      },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    return claim;
  }

  /** Original single-URL submit (backward compatible) */
  async submit(id: string, clipperId: string, dto: SubmitClaimDto) {
    const claim = await this.prisma.clipClaim.findUnique({
      where: { id },
      include: { submissions: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.clipperId !== clipperId) throw new ForbiddenException('Not your claim');
    if (claim.status !== ClaimStatus.CLAIMED) {
      throw new BadRequestException('Claim is not in CLAIMED status');
    }

    // Auto-detect platform from URL
    const platform = this.detectPlatform(dto.socialUrl);

    // Check no existing submission for this platform
    const existingSub = claim.submissions.find((s) => s.platform === platform);
    if (existingSub) {
      throw new ConflictException(`Submission already exists for platform ${platform}`);
    }

    const externalPostId = extractExternalPostId(dto.socialUrl, platform);

    const [submission] = await this.prisma.$transaction([
      this.prisma.clipSubmission.create({
        data: {
          claimId: id,
          socialUrl: dto.socialUrl,
          platform,
          externalPostId,
        },
      }),
      this.prisma.clipClaim.update({
        where: { id },
        data: { status: ClaimStatus.SUBMITTED },
      }),
    ]);

    // Auto-trigger verification
    await this.verificationQueue.add('verify-clip', {
      submissionId: submission.id,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 10000 },
      timeout: 300000,
    });

    return submission;
  }

  /** Multi-URL submit: up to 3 URLs (one per platform) for the same claim */
  async submitMulti(id: string, clipperId: string, dto: SubmitClaimMultiDto) {
    const claim = await this.prisma.clipClaim.findUnique({
      where: { id },
      include: { submissions: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.clipperId !== clipperId) throw new ForbiddenException('Not your claim');
    if (claim.status !== ClaimStatus.CLAIMED && claim.status !== ClaimStatus.SUBMITTED) {
      throw new BadRequestException('Claim is not in a submittable status');
    }

    // Check for duplicate platforms in the request
    const platforms = dto.urls.map((u) => u.platform);
    if (new Set(platforms).size !== platforms.length) {
      throw new BadRequestException('Duplicate platforms in submission');
    }

    // Check for existing submissions on these platforms
    const existingPlatforms = claim.submissions.map((s) => s.platform);
    const conflicts = platforms.filter((p) => existingPlatforms.includes(p));
    if (conflicts.length > 0) {
      throw new ConflictException(
        `Submissions already exist for platforms: ${conflicts.join(', ')}`,
      );
    }

    // Validate each URL matches its declared platform
    for (const entry of dto.urls) {
      if (!validateUrlForPlatform(entry.url, entry.platform)) {
        throw new BadRequestException(
          `URL does not match platform ${entry.platform}: ${entry.url}`,
        );
      }
    }

    // Create all submissions in a transaction
    const submissions = await this.prisma.$transaction(async (tx) => {
      const created = [];
      for (const entry of dto.urls) {
        const externalPostId = extractExternalPostId(entry.url, entry.platform);
        const sub = await tx.clipSubmission.create({
          data: {
            claimId: id,
            socialUrl: entry.url,
            platform: entry.platform,
            externalPostId,
          },
        });
        created.push(sub);
      }
      await tx.clipClaim.update({
        where: { id },
        data: { status: ClaimStatus.SUBMITTED },
      });
      return created;
    });

    // Queue verification for each submission
    for (const sub of submissions) {
      await this.verificationQueue.add('verify-clip', {
        submissionId: sub.id,
      }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10000 },
        timeout: 300000,
      });
    }

    return submissions;
  }

  private detectPlatform(url: string): SocialPlatform {
    if (/tiktok\.com/i.test(url)) return 'TIKTOK';
    if (/instagram\.com/i.test(url)) return 'INSTAGRAM';
    if (/youtube\.com|youtu\.be/i.test(url)) return 'YOUTUBE';
    throw new BadRequestException('URL must be from TikTok, Instagram, or YouTube');
  }
}
