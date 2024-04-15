import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../pagination.request';
import { IsOptional } from 'class-validator';

export class ListDeviceModelDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'search keyword: device model name',
  })
  @IsOptional()
  public q?: string = '';
}
