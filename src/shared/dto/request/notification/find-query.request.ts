import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { PAGINATION_DEFAULT, PAGINATION_SORT } from 'src/shared/constants/pagination.constants';

export class FindQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => JSON.parse(value))
  public page?: number = PAGINATION_DEFAULT.PAGE;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => JSON.parse(value))
  public limit?: number = PAGINATION_DEFAULT.LIMIT;

  @ApiPropertyOptional()
  @IsOptional()
  public sort_by?: string = 'createdOn';

  @ApiPropertyOptional({ enum: [1, -1], description: `1: ASC; -1: DESC` })
  @IsOptional()
  @Transform(({ value }) => JSON.parse(value))
  public sort_order?: number = PAGINATION_SORT.DESC;

  @Expose()
  @Transform(
    ({ obj: { page, limit } }) =>
      ((Number(page) || PAGINATION_DEFAULT.PAGE) - 1) * (Number(limit) || PAGINATION_DEFAULT.LIMIT),
  )
  public skip: number;
}
