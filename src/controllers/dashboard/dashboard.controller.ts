import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DashboardService } from 'src/modules/dashboard/dashboard.service';
import { User } from 'src/decorators/user.decorator';
import { ObjectId } from 'mongodb';
import { UserModel } from 'src/shared/models/user.model';

@ApiTags('dashboard')
@Controller('dashboard')
// @UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}
}
