import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumberString,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';
import type { PaymentStatus } from '../../entities/payment.entity';

export class UpdatePaymentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'cancelled'] })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status?: PaymentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
