import { IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { SourceType } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  title!: string;

  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsOptional()
  @IsUrl()
  sourceUrl?: string;
}
