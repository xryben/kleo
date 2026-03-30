import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { AdminService, CreateTenantDto, UpdateTenantDto } from './admin.service';
import { AdminGuard } from './admin.guard';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
  constructor(
    private admin: AdminService,
    private jwt: JwtService,
  ) {}

  @Get('stats')
  getStats() {
    return this.admin.getStats();
  }

  @Get('tenants')
  listTenants() {
    return this.admin.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.admin.getTenant(id);
  }

  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.admin.createTenant(dto);
  }

  @Put('tenants/:id')
  updateTenant(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.admin.updateTenant(id, dto);
  }

  @Delete('tenants/:id')
  deleteTenant(@Param('id') id: string) {
    return this.admin.deleteTenant(id);
  }

  @Post('tenants/:id/impersonate')
  async impersonate(@Param('id') id: string) {
    const user = await this.admin.impersonate(id);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    const token = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      { secret },
    );
    return { token, user: { id: user.id, email: user.email, name: user.name } };
  }
}
