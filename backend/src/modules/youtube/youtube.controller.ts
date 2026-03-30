import {
  Controller,
  Get,
  Delete,
  Query,
  UseGuards,
  Request,
  Redirect,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { YouTubeService } from './youtube.service';
import { AuthUser } from '../auth/jwt.strategy';

interface AuthRequest extends Request {
  user: AuthUser;
}

@Controller('youtube')
export class YouTubeController {
  private readonly logger = new Logger(YouTubeController.name);
  private readonly frontendUrl: string;
  constructor(
    private youtube: YouTubeService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.getOrThrow<string>('app.frontendUrl');
  }

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
      return { url: `${this.frontendUrl}/settings?yt=connected` };
    } catch (err) {
      this.logger.error(
        `YouTube callback failed for user ${userId}: ${err instanceof Error ? err.message : err}`,
      );
      return { url: `${this.frontendUrl}/settings?yt=error` };
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
