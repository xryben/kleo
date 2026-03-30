import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, AddClipsToCampaignDto } from './dto/create-campaign.dto';

interface AuthRequest extends Request {
  user: { id: string; email: string; name: string; role: string; tenantId: string | null };
}

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'))
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  private getTenantId(req: AuthRequest): string {
    if (!req.user.tenantId) throw new ForbiddenException('No tenant assigned');
    return req.user.tenantId;
  }

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateCampaignDto) {
    return this.campaigns.create(req.user.id, this.getTenantId(req), dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.campaigns.findAllByOwner(req.user.id, this.getTenantId(req));
  }

  @Get('public')
  findPublic() {
    return this.campaigns.findPublicActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaigns.findOne(id);
  }

  @Patch(':id')
  update(@Request() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaigns.update(id, req.user.id, this.getTenantId(req), dto);
  }

  @Post(':id/clips')
  addClips(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: AddClipsToCampaignDto,
  ) {
    return this.campaigns.addClips(id, req.user.id, this.getTenantId(req), dto.clipIds);
  }

  @Delete(':id/clips/:clipId')
  removeClip(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('clipId') clipId: string,
  ) {
    return this.campaigns.removeClip(id, clipId, req.user.id, this.getTenantId(req));
  }
}
