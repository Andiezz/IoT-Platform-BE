import {
  Body,
  Controller,
  Post,
  HttpCode,
  Param,
  Get,
  Put,
  Query,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { DeviceModelService } from 'src/modules/device-model/device-model.service';
import { CreateDeviceModelDto } from 'src/shared/dto/request/device-model/create.request';
import { ListDeviceModelDto } from 'src/shared/dto/request/device-model/list.request';
import { ROLE, UserModel } from 'src/shared/models/user.model';

@ApiTags('device-model')
@Controller('device-model')
@ApiBearerAuth()
@Roles([ROLE.ADMIN])
export class DeviceModelController {
  constructor(private readonly deviceModelService: DeviceModelService) {}

  @Post()
  @ApiBody({ type: CreateDeviceModelDto })
  @HttpCode(200)
  async create(
    @Body() body: CreateDeviceModelDto,
    @User() user: UserModel,
  ): Promise<string> {
    return await this.deviceModelService.create(body, user);
  }

  @Put('/:deviceModelId')
  @ApiBody({ type: CreateDeviceModelDto })
  @HttpCode(200)
  async update(
    @Param('deviceModelId') deviceModelId: string,
    @Body() body: CreateDeviceModelDto,
    @User() user: UserModel,
  ): Promise<string> {
    return await this.deviceModelService.update(
      new ObjectId(deviceModelId),
      body,
      user,
    );
  }

  @Get()
  async list(@Query() query: ListDeviceModelDto) {
    return await this.deviceModelService.list(query);
  }

  @Get('/names')
  async listParameterName() {
    return await this.deviceModelService.listDeviceModelNames();
  }

  @Get('/:deviceModelId')
  async getDeviceModel(@Param('deviceModelId') deviceModelId: string) {
    return await this.deviceModelService.getDeviceModel(
      new ObjectId(deviceModelId),
    );
  }

  @Delete('/:deviceModelId')
  async delete(@Param('deviceModelId') deviceModelId: string) {
    return await this.deviceModelService.deleteDeviceModel(
      new ObjectId(deviceModelId),
    );
  }
}
