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
import { InstagramService } from './instagram.service';
import { User } from '@prisma/client';

interface AuthRequest extends Request {
  user: User;
}

@Controller('instagram')
export class InstagramController {
  private readonly logger = new Logger(InstagramController.name);
  private readonly frontendUrl: string;
  constructor(
    private instagram: InstagramService,
    config: ConfigService,
  ) {
    this.frontendUrl = config.getOrThrow<string>('app.frontendUrl');
  }

  @Get('auth-url')
  @UseGuards(AuthGuard('jwt'))
  getAuthUrl() {
    return { url: this.instagram.getAuthUrl() };
  }

  @Get('callback')
  @Redirect()
  async callback(@Query('code') code: string, @Query('state') state: string) {
    // state = userId passed when redirecting to IG auth
    try {
      await this.instagram.handleCallback(code, state);
      return { url: `${this.frontendUrl}/settings?ig=connected` };
    } catch (err) {
      this.logger.error(
        `Instagram callback failed for user ${state}: ${err instanceof Error ? err.message : err}`,
      );
      return { url: `${this.frontendUrl}/settings?ig=error` };
    }
  }

  @Get('status')
  @UseGuards(AuthGuard('jwt'))
  getStatus(@Request() req: AuthRequest) {
    return this.instagram.getStatus(req.user.id);
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard('jwt'))
  disconnect(@Request() req: AuthRequest) {
    return this.instagram.disconnect(req.user.id);
  }
}
