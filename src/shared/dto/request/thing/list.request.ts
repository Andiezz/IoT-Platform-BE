import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DEVICE_STATUS } from 'src/shared/models/thing.model';
import { PaginationDto } from '../pagination.request';

export class ListThingDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'search keyword: thingId, thingName, thingManager, thingLocation, thingInformation',
  })
  @IsOptional()
  public q?: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(DEVICE_STATUS)
  status: DEVICE_STATUS;

  @ApiPropertyOptional()
  @IsOptional()
  public userId?: string = '';
}
