import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    @InjectQueue('video-processing') private queue: Queue,
  ) {}

  async create(userId: string, tenantId: string, dto: CreateProjectDto, localPath?: string) {
    const project = await this.prisma.videoProject.create({
      data: {
        userId,
        tenantId,
        title: dto.title,
        sourceType: dto.sourceType,
        sourceUrl: dto.sourceUrl,
        localPath,
        status: 'PENDING',
      },
    });

    await this.queue.add('process', { projectId: project.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    return project;
  }

  async findAll(tenantId: string) {
    return this.prisma.videoProject.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { clips: true } } },
    });
  }

  async findOne(id: string, tenantId: string) {
    const project = await this.prisma.videoProject.findUnique({
      where: { id },
      include: { clips: { orderBy: { startTime: 'asc' } } },
    });
    if (!project) throw new NotFoundException('Proyecto no encontrado');
    if (project.tenantId !== tenantId) throw new ForbiddenException();
    return project;
  }

  async remove(id: string, tenantId: string) {
    const project = await this.prisma.videoProject.findUnique({ where: { id } });
    if (!project) throw new NotFoundException();
    if (project.tenantId !== tenantId) throw new ForbiddenException();
    await this.prisma.videoProject.delete({ where: { id } });
    return { ok: true };
  }
}
