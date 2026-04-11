import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';

export class PartnersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }: { value: string }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;
}
