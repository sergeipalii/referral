import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsIn } from 'class-validator';

export class UpsertIntegrationDto {
  @ApiProperty({ enum: ['amplitude'], example: 'amplitude' })
  @IsString()
  @IsIn(['amplitude'])
  providerType: string;

  @ApiProperty({ example: 'your-amplitude-api-key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiProperty({ example: 'your-amplitude-secret-key' })
  @IsString()
  @IsNotEmpty()
  secretKey: string;

  @ApiPropertyOptional({ example: 'utm_source', default: 'utm_source' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  utmParameterName?: string;

  @ApiPropertyOptional({ example: '123456', description: 'Amplitude Project ID (optional)' })
  @IsOptional()
  @IsString()
  projectId?: string;
}
