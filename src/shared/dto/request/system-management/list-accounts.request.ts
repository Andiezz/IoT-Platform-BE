import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { Expose, Transform } from 'class-transformer';
import { PAGINATION_DEFAULT, PAGINATION_SORT } from 'src/shared/constants/pagination.constants';
import { ROLE } from 'src/shared/models/user.model';

export class ListAccountsDTO {
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
  public sortBy?: string = 'createdOn';

  @ApiPropertyOptional({ enum: [1, -1], description: `1: ASC; -1: DESC` })
  @IsOptional()
  @Transform(({ value }) => JSON.parse(value))
  public sortOrder?: number = PAGINATION_SORT.DESC;

  @ApiPropertyOptional({ description: 'search keyword' })
  @IsOptional()
  public q?: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => JSON.parse(value))
  public isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  public role?: ROLE;

  @Expose()
  @Transform(
    ({ obj: { page, limit } }) =>
      ((Number(page) || PAGINATION_DEFAULT.PAGE) - 1) * (Number(limit) || PAGINATION_DEFAULT.LIMIT),
  )
  public skip: number;
}
