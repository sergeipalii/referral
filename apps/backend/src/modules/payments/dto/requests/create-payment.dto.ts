import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumberString,
  IsOptional,
  IsEnum,
  IsString,
  IsDateString,
  IsObject,
  MaxLength,
} from 'class-validator';
import type { PaymentStatus } from '../../entities/payment.entity';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  partnerId: string;

  @ApiProperty({ example: '100.000000' })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ enum: ['pending', 'completed', 'cancelled'], default: 'completed' })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'cancelled'])
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: 'BANK-TX-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ example: '2024-01-31' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;

  @ApiPropertyOptional({ example: '2024-02-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
