import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class AccrualRulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by partner ID' })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ description: 'Filter by event name' })
  @IsOptional()
  @IsString()
  eventName?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;
}
