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
  @ApiPropertyOptional({
    example: 'ACME_2024',
    description:
      'Partner referral code. Required for the very first event of a new user; on subsequent events for the same `externalUserId` the stored attribution takes over.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  partnerCode?: string;

  @ApiPropertyOptional({
    example: 'user_1234',
    description:
      'Stable identifier of the end-user in your app. Enables recurring attribution — the first time we see this ID together with a partnerCode we map them together, later events (e.g. subscription renewals) can pay the partner again without re-sending partnerCode.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalUserId?: string;

  @ApiPropertyOptional({
    example: 'ALICE10',
    description:
      "Promo code entered at checkout. If valid, overrides partnerCode — the code's associated partner gets credit. Case-insensitive.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  promoCode?: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description:
      'Click ID from the tracking link cookie (rk_click). Resolves partner from the stored click if the attribution window is still open.',
  })
  @IsOptional()
  @IsString()
  clickId?: string;

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
