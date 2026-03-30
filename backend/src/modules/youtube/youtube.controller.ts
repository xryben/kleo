import { Controller, Get, Delete, Query, UseGuards, Request, Redirect } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { YouTubeService } from './youtube.service';
import { AuthUser } from '../auth/jwt.strategy';

interface AuthRequest extends Request {
  user: AuthUser;
}

@Controller('youtube')
export class YouTubeController {
  constructor(private youtube: YouTubeService) {}

  @Get('auth-url')
  @UseGuards(AuthGuard('jwt'))
  getAuthUrl(@Request() req: AuthRequest) {
    return { url: this.youtube.getAuthUrl(req.user.id) };
  }

  @Get('callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') userId: string) {
    try {
      await this.youtube.handleCallback(code, userId);
      return { url: `${process.env.FRONTEND_URL}/settings?yt=connected` };
    } catch {
      return { url: `${process.env.FRONTEND_URL}/settings?yt=error` };
    }
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  getStatus(@Request() req: AuthRequest) {
    return this.youtube.getStatus(req.user.id);
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard('jwt'))
  disconnect(@Request() req: AuthRequest) {
    return this.youtube.disconnect(req.user.id);
  }
}
