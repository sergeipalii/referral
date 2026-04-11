import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class TriggerSyncDto {
  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Start of the sync range. Defaults to lastSyncedAt or 30 days ago.',
  })
  @IsOptional()
  @IsDateString()
  rangeStart?: string;

  @ApiPropertyOptional({
    example: '2024-01-31T23:59:59.000Z',
    description: 'End of the sync range. Defaults to now.',
  })
  @IsOptional()
  @IsDateString()
  rangeEnd?: string;
}
