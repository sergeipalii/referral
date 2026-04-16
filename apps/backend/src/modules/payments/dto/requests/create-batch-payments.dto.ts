import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Create pending payments in bulk — one per eligible partner, amount equal to
 * their current unpaid balance. Reference and period tags the batch for later
 * reconciliation (e.g. "Q1 2026 partner payouts").
 */
export class CreateBatchPaymentsDto {
  @ApiProperty({ example: '2026-01-01', description: 'Period start (inclusive)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-03-31', description: 'Period end (inclusive)' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({
    description:
      'Restrict to specific partners. Default: all active partners with positive balance.',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  partnerIds?: string[];

  @ApiPropertyOptional({
    description:
      'Skip partners whose balance falls below this threshold (default 0).',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Reference tag applied to every created payment record',
    example: 'Q1-2026-batch',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  reference?: string;
}

export class BatchPaymentsResultDto {
  @ApiProperty({ description: 'Number of pending payments created' })
  created: number;

  @ApiProperty({ description: 'Total amount (sum of created payments)' })
  totalAmount: string;

  @ApiProperty({
    description: 'Partners skipped because balance was below the threshold',
  })
  skippedPartners: number;

  @ApiProperty({ description: 'Created payment IDs' })
  paymentIds: string[];
}
