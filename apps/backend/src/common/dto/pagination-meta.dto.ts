import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 150 })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages', example: 8 })
  totalPages: number;

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
  })
  hasPreviousPage: boolean;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Array of items for current page' })
  data: T[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
