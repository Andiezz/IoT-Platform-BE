import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';
import { PAGINATION_DEFAULT } from 'src/shared/constants/pagination.constants';

export class PaginationBaseResponse<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  readonly paginatedResults: T[];

  @ApiProperty({ type: Number, default: PAGINATION_DEFAULT.PAGE })
  readonly page: number;

  @ApiProperty({ type: Number, default: PAGINATION_DEFAULT.LIMIT })
  readonly limit: number;

  @ApiProperty({ type: Number, default: 0 })
  readonly current: number;

  @ApiProperty({ type: Number, default: 0 })
  readonly total: number;

  constructor(data: T[], page: number, limit: number, total: number) {
    this.paginatedResults = data;
    this.current = data.length;
    this.page = page;
    this.limit = limit;
    this.total = total;
  }
}
