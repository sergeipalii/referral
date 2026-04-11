import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty({ example: 'ACME_2024', description: 'Unique referral code (used as UTM value)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code: string;

  @ApiProperty({ example: 'Acme Corp', description: 'Partner display name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Main partner for EU region' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: { email: 'partner@acme.com', paymentDetails: 'IBAN...' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
