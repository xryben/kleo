import { IsInt, IsString, Min } from 'class-validator';

export class DepositDto {
  @IsString()
  campaignId: string;

  @IsInt()
  @Min(100) // Minimum $1
  amountCents: number;
}
