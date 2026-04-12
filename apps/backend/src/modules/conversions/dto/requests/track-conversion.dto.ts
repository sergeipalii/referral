import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';

export class TrackConversionDto {
  @ApiProperty({ example: 'ACME_2024', description: 'Partner referral code' })
  @IsString()
  @IsNotEmpty()
  partnerCode: string;

  @ApiProperty({ example: 'signup', description: 'Event name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  eventName: string;

  @ApiPropertyOptional({
    example: '2026-04-11',
    description: 'Event date (ISO format, defaults to today)',
  })
  @IsOptional()
  @IsDateString()
  eventDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Event count (defaults to 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'Revenue amount (defaults to 0)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  revenue?: number;

  @ApiPropertyOptional({
    example: 'evt_abc123',
    description: 'Idempotency key to prevent duplicate processing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  idempotencyKey?: string;
}
