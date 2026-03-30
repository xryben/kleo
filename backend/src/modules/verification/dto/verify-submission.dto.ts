import { IsString, IsNotEmpty } from 'class-validator';

export class VerifySubmissionDto {
  @IsString()
  @IsNotEmpty()
  submissionId!: string;
}
