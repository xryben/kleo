import { IsString, IsOptional, IsInt, Min, IsDateString, IsEnum } from 'class-validator';
import { CampaignStatus } from '@prisma/client';

export class CreateCampaignDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  budgetCents: number;

  @IsInt()
  @Min(1)
  cpmCents: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  budgetCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cpmCents?: number;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AddClipsToCampaignDto {
  @IsString({ each: true })
  clipIds: string[];
}
