import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsDateString } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class ConversionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventName?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
