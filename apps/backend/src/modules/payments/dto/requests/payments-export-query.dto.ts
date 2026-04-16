import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import type { PaymentStatus } from '../../entities/payment.entity';

/**
 * Filters for the CSV export. Intentionally separate from PaymentsQueryDto
 * because pagination doesn't make sense for a bulk export — the endpoint
 * streams the whole result set.
 */
export class PaymentsExportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
