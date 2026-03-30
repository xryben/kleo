import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ClipsModule } from './modules/clips/clips.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { AdminModule } from './modules/admin/admin.module';
import { YouTubeModule } from './modules/youtube/youtube.module';
import { TikTokModule } from './modules/tiktok/tiktok.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { VerificationModule } from './modules/verification/verification.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    BullModule.forRoot({
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    }),
    AuthModule,
    UsersModule,
    ProjectsModule,
    ClipsModule,
    ProcessingModule,
    InstagramModule,
    AdminModule,
    YouTubeModule,
    TikTokModule,
    CampaignsModule,
    ClaimsModule,
    MarketplaceModule,
    VerificationModule,
    PaymentsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
