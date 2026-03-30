import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  findAll(
    @Query('platform') platform?: string,
    @Query('minCpm') minCpm?: string,
    @Query('maxCpm') maxCpm?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.marketplace.findAvailableClips({
      platform,
      minCpm: minCpm ? parseInt(minCpm, 10) : undefined,
      maxCpm: maxCpm ? parseInt(maxCpm, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':clipId')
  findOne(@Param('clipId') clipId: string) {
    return this.marketplace.findClipDetail(clipId);
  }
}
