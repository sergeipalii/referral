import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import type { PaymentStatus } from '../../payments/entities/payment.entity';

/**
 * Partner-scoped listing queries intentionally omit `partnerId` — the portal
 * always injects it from the JWT to prevent a partner from peeking into
 * another partner's data by crafting the query string.
 */

export class PartnerConversionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventName?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class PartnerPaymentsQueryDto extends PaginationQueryDto {
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
