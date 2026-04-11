import { PaginationMetaDto } from '../dto/pagination-meta.dto';

export default interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMetaDto;
}
