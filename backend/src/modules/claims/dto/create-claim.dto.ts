import {
  IsString,
  IsEnum,
  IsUrl,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SocialPlatform } from '@prisma/client';

export class CreateClaimDto {
  @IsString()
  campaignClipId: string;
}

export class SubmitClaimDto {
  @IsUrl()
  socialUrl: string;
}

export class SubmissionUrlDto {
  @IsEnum(SocialPlatform)
  platform: SocialPlatform;

  @IsUrl()
  url: string;
}

export class SubmitClaimMultiDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => SubmissionUrlDto)
  urls: SubmissionUrlDto[];
}
