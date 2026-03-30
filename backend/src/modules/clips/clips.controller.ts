import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { SocialPlatform } from '@prisma/client';
import { ClipsService } from './clips.service';
import { AuthUser } from '../auth/jwt.strategy';

interface AuthRequest extends Request {
  user: AuthUser;
}

@Controller('clips')
@UseGuards(AuthGuard('jwt'))
export class ClipsController {
  constructor(private clips: ClipsService) {}

  private getTenantId(req: AuthRequest): string {
    if (!req.user.tenantId) throw new Error('Sin tenant');
    return req.user.tenantId;
  }

  @Get(':id')
  findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.clips.findOne(id, this.getTenantId(req));
  }

  @Get(':id/stream')
  stream(@Request() req: AuthRequest, @Param('id') id: string, @Res() res: Response) {
    return this.clips.stream(id, this.getTenantId(req), res);
  }

  @Post(':id/publish')
  publish(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Query('platform') platform: SocialPlatform = 'INSTAGRAM',
  ) {
    return this.clips.publish(id, this.getTenantId(req), platform);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.clips.remove(id, this.getTenantId(req));
  }
}
