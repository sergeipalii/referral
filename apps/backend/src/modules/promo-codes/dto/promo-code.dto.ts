import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PromoCodeEntity } from '../entities/promo-code.entity';

// ─── Request DTOs ─────────────────────────────────────────────────────────

export class CreatePromoCodeDto {
  @ApiProperty({ description: 'Partner who gets credit when this code is used' })
  @IsUUID()
  partnerId: string;

  @ApiProperty({
    example: 'ALICE10',
    description: 'Case-insensitive; stored lowercase',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Max uses; null = unlimited',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ description: 'Arbitrary metadata (e.g. discount hints)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdatePromoCodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ─── Response DTOs ────────────────────────────────────────────────────────

export class PromoCodeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  usageLimit: number | null;

  @ApiProperty()
  usedCount: number;

  @ApiPropertyOptional()
  metadata: Record<string, unknown> | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  static fromEntity(e: PromoCodeEntity): PromoCodeResponseDto {
    return {
      id: e.id,
      partnerId: e.partnerId,
      code: e.code,
      usageLimit: e.usageLimit,
      usedCount: e.usedCount,
      metadata: e.metadata,
      isActive: e.isActive,
      createdAt: e.createdAt,
    };
  }
}

export class ResolvedPromoCodeDto {
  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  partnerCode: string;
}
