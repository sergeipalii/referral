import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production API Key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class ApiKeyCreatedDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Full API key (shown only once)' })
  key: string;

  @ApiProperty()
  createdAt: Date;
}

export class ApiKeyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Key prefix for identification', example: 'rk_a1b2c3d4' })
  prefix: string;

  @ApiPropertyOptional()
  lastUsedAt: Date | null;

  @ApiProperty()
  createdAt: Date;
}
