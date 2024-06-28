import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import * as moment from 'moment-timezone';
import { BadRequestException } from '@nestjs/common';
import { CHART_TYPE } from 'src/shared/constants/dashboard.constants';

export class GetDashboardDto {
  @IsOptional()
  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (!value) return moment.tz('Asia/Ho_Chi_Minh').startOf('day').toDate();
    const date = moment(value);
    if (!date.isValid()) throw new BadRequestException('from-is-valid-false');
    return date.toDate();
  })
  public from: Date;

  @IsOptional()
  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (!value) {
      return moment.tz('Asia/Ho_Chi_Minh').endOf('day').toDate();
    }
    const date = moment(value);
    if (!date.isValid()) throw new BadRequestException('to-is-valid-false');
    return date.toDate();
  })
  public to: Date;

  @ApiPropertyOptional({ enum: Object.values(CHART_TYPE) })
  @IsNotEmpty()
  @IsEnum(CHART_TYPE)
  type: CHART_TYPE = CHART_TYPE.DAY;

  @ApiPropertyOptional()
  public timezone?: string = 'Asia/Ho_Chi_Minh';
}
