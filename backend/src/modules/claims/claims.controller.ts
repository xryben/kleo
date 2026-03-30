import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClaimsService } from './claims.service';
import {
  CreateClaimDto,
  SubmitClaimDto,
  SubmitClaimMultiDto,
} from './dto/create-claim.dto';

interface AuthRequest extends Request {
  user: { id: string; email: string; name: string; role: string; tenantId: string | null };
}

@Controller('claims')
@UseGuards(AuthGuard('jwt'))
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateClaimDto) {
    return this.claims.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.claims.findAllByClipper(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
    const claim = await this.claims.findOne(id);
    if (claim.clipperId !== req.user.id && claim.campaignClip.campaign.userId !== req.user.id) {
      throw new ForbiddenException('Not authorized to view this claim');
    }
    return claim;
  }

  @Post(':id/submit')
  submit(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: SubmitClaimDto,
  ) {
    return this.claims.submit(id, req.user.id, dto);
  }

  @Post(':id/submissions')
  submitMulti(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: SubmitClaimMultiDto,
  ) {
    return this.claims.submitMulti(id, req.user.id, dto);
  }
}
