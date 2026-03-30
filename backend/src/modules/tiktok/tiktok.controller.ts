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
import { TikTokService } from './tiktok.service';
import { AuthUser } from '../auth/jwt.strategy';

interface AuthRequest extends Request {
  user: AuthUser;
}

@Controller('tiktok')
export class TikTokController {
  private readonly logger = new Logger(TikTokController.name);
  private readonly frontendUrl: string;
  constructor(
    private tiktok: TikTokService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.getOrThrow<string>('app.frontendUrl');
  }

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
      return { url: `${this.frontendUrl}/settings?tt=connected` };
    } catch (err) {
      this.logger.error(
        `TikTok callback failed for user ${userId}: ${err instanceof Error ? err.message : err}`,
      );
      return { url: `${this.frontendUrl}/settings?tt=error` };
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
