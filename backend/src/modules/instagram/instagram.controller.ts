import { Controller, Get, Delete, Query, UseGuards, Request, Redirect } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InstagramService } from './instagram.service';
import { User } from '@prisma/client';

interface AuthRequest extends Request {
  user: User;
}

@Controller('instagram')
export class InstagramController {
  constructor(private instagram: InstagramService) {}

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
      return { url: `${process.env.FRONTEND_URL || 'http://localhost:4003'}/settings?ig=connected` };
    } catch {
      return { url: `${process.env.FRONTEND_URL || 'http://localhost:4003'}/settings?ig=error` };
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
