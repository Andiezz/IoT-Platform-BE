import { ApiProperty } from "@nestjs/swagger";

export class PaginationBaseResponse<T> {
  paginatedResults: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  current: number;
}