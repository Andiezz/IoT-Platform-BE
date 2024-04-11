import { Body, Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { User } from 'src/decorators/user.decorator';
import { ObjectId } from 'mongodb';
import { UserModel } from 'src/shared/models/user.model';
import { ApiOkResponseBase } from 'src/shared/utils/swagger.utils';
import { GetDashboardDto } from 'src/shared/dto/request/dashboard/get-dashboard.request';
import { TimeseriesData } from 'src/shared/dto/response/dashboard/dashboard.response';

@ApiTags('dashboard')
@Controller('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('thing/:thingId')
  @ApiOkResponseBase(Array<TimeseriesData>)
  public async getTimeseriesData(
    @Param('thingId') thingId: string,
    @Query() getDashboardDto: GetDashboardDto,
    @User() user: UserModel,
  ) {
    return await this.service.getTimeseriesData(
      new ObjectId(thingId),
      getDashboardDto,
    );
  }
}
