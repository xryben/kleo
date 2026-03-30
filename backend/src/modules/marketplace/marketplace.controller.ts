import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceQueryDto } from './dto/marketplace-query.dto';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  findAll(@Query() query: MarketplaceQueryDto) {
    return this.marketplace.findAvailableClips(query);
  }

  @Get(':clipId')
  findOne(@Param('clipId') clipId: string) {
    return this.marketplace.findClipDetail(clipId);
  }
}
