import { Injectable, NotFoundException } from '@nestjs/common';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Plan } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

export class CreateTenantDto {
  @IsString() name!: string;
  @IsString() slug!: string;
  @IsString() ownerName!: string;
  @IsString() ownerEmail!: string;
  @IsString() ownerPassword!: string;
  @IsOptional() @IsEnum(Plan) plan?: Plan;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(Plan) plan?: Plan;
  @IsOptional() @IsBoolean() active?: boolean;
}

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [tenants, users, projects, clips, publishedClips] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      this.prisma.videoProject.count(),
      this.prisma.clip.count(),
      this.prisma.socialPublish.count({ where: { status: 'PUBLISHED' } }),
    ]);

    const projectsByStatus = await this.prisma.videoProject.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const recentProjects = await this.prisma.videoProject.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { name: true, slug: true } },
        user: { select: { name: true, email: true } },
        _count: { select: { clips: true } },
      },
    });

    return {
      totals: { tenants, users, projects, clips, publishedClips },
      projectsByStatus: Object.fromEntries(projectsByStatus.map((s) => [s.status, s._count.id])),
      recentProjects,
    };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, projects: true } },
      },
    });
  }

  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        _count: { select: { projects: true } },
        projects: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { clips: true } } },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return tenant;
  }

  async createTenant(dto: CreateTenantDto) {
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash(dto.ownerPassword, 12);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.name, slug: dto.slug, plan: dto.plan ?? 'FREE' },
      });
      const user = await tx.user.create({
        data: {
          name: dto.ownerName,
          email: dto.ownerEmail,
          password: hash,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });
      return { tenant, user: { id: user.id, email: user.email, name: user.name } };
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto) {
    await this.getTenant(id);
    return this.prisma.tenant.update({ where: { id }, data: dto });
  }

  async deleteTenant(id: string) {
    await this.getTenant(id);
    await this.prisma.tenant.delete({ where: { id } });
    return { ok: true };
  }

  async impersonate(tenantId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { tenantId, role: 'OWNER' },
    });
    if (!owner) throw new NotFoundException('Owner no encontrado');
    return owner;
  }
}
