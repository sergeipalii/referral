import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import type { PaymentStatus } from '../../entities/payment.entity';

export class PaymentsQueryDto extends PaginationQueryDto {
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
