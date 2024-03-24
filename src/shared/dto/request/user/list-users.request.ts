import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Expose } from "class-transformer";
import { IsOptional } from "class-validator";
import { PAGINATION_DEFAULT, PAGINATION_SORT } from "src/shared/constants/pagination.constants";
import { ROLE } from "src/shared/models/user.model";

export class ListUsersDTO {
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
  public isActive?: boolean = true;
  
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }: { value: string }) => value.split(',').map(item => Number(item)).map(item => ROLE[item]).filter(item => item))
  public excludeRoles?: number[] = [];

  @Expose()
  @Transform(({ obj: { page, limit } }) => ((Number(page) || PAGINATION_DEFAULT.PAGE) - 1) * (Number(limit) || PAGINATION_DEFAULT.LIMIT))
  public skip: number;
}