import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { SyncJobStatus } from '../../entities/analytics-sync-job.entity';
import { AnalyticsSyncJobEntity } from '../../entities/analytics-sync-job.entity';

export class AnalyticsSyncJobDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  integrationId: string;

  @ApiProperty({ enum: ['running', 'completed', 'failed'] })
  status: SyncJobStatus;

  @ApiProperty()
  rangeStart: Date;

  @ApiProperty()
  rangeEnd: Date;

  @ApiProperty()
  rawEventsCount: number;

  @ApiProperty()
  conversionsCount: number;

  @ApiPropertyOptional()
  errorMessage: string | null;

  @ApiPropertyOptional()
  completedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(entity: AnalyticsSyncJobEntity): AnalyticsSyncJobDto {
    const dto = new AnalyticsSyncJobDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.integrationId = entity.integrationId;
    dto.status = entity.status;
    dto.rangeStart = entity.rangeStart;
    dto.rangeEnd = entity.rangeEnd;
    dto.rawEventsCount = entity.rawEventsCount;
    dto.conversionsCount = entity.conversionsCount;
    dto.errorMessage = entity.errorMessage;
    dto.completedAt = entity.completedAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
