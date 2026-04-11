import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdatePartnerDto {
  @ApiPropertyOptional({ example: 'ACME_2025' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code?: string;

  @ApiPropertyOptional({ example: 'Acme Corp Updated' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
