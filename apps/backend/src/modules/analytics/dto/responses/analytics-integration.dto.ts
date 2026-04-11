import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsIntegrationEntity } from '../../entities/analytics-integration.entity';

export class AnalyticsIntegrationDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ example: 'amplitude' })
  providerType: string;

  @ApiProperty({ example: 'utm_source' })
  utmParameterName: string;

  @ApiPropertyOptional()
  lastSyncedAt: Date | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: AnalyticsIntegrationEntity): AnalyticsIntegrationDto {
    const dto = new AnalyticsIntegrationDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.providerType = entity.providerType;
    dto.utmParameterName = entity.utmParameterName;
    dto.lastSyncedAt = entity.lastSyncedAt;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
