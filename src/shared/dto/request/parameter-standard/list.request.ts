import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../pagination.request';
import { IsOptional } from 'class-validator';

export class ListParameterStandardDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'search keyword: parameter name',
  })
  @IsOptional()
  public q?: string = '';
}
