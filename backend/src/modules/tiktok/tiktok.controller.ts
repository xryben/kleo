import { Controller, Get, Delete, Query, UseGuards, Request, Redirect } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TikTokService } from './tiktok.service';
import { AuthUser } from '../auth/jwt.strategy';

interface AuthRequest extends Request {
  user: AuthUser;
}

@Controller('tiktok')
export class TikTokController {
  constructor(private tiktok: TikTokService) {}

  @Get('auth-url')
  @UseGuards(AuthGuard('jwt'))
  getAuthUrl(@Request() req: AuthRequest) {
    return { url: this.tiktok.getAuthUrl(req.user.id) };
  }

  @Get('callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') userId: string) {
    try {
      await this.tiktok.handleCallback(code, userId);
      return { url: `${process.env.FRONTEND_URL}/settings?tt=connected` };
    } catch {
      return { url: `${process.env.FRONTEND_URL}/settings?tt=error` };
    }
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  getStatus(@Request() req: AuthRequest) {
    return this.tiktok.getStatus(req.user.id);
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard('jwt'))
  disconnect(@Request() req: AuthRequest) {
    return this.tiktok.disconnect(req.user.id);
  }
}
