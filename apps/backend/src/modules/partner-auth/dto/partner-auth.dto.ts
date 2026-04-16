import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class CreatePartnerInvitationDto {
  @ApiProperty({ description: 'Target partner ID (owned by the caller)' })
  @IsUUID()
  partnerId: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;
}

export class PartnerInvitationCreatedDto {
  @ApiProperty({ description: 'Opaque one-time token (share with partner)' })
  token: string;

  @ApiProperty({ description: 'Expiry timestamp (ISO 8601)' })
  expiresAt: Date;

  @ApiProperty()
  partnerId: string;

  @ApiProperty()
  email: string;
}

export class AcceptPartnerInvitationDto {
  @ApiProperty({ description: 'Invitation token from the URL' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}

export class PartnerLoginDto {
  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class PartnerRefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class PartnerAuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class PartnerSelfDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastLoginAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
