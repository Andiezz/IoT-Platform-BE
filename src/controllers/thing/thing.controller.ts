import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  HttpCode,
  Param,
  Get,
  Put,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';
import { Roles } from 'src/decorators/roles.decorator';
import { User } from 'src/decorators/user.decorator';
import { RolesGuard } from 'src/guards/roles.guard';
import { ThingService } from 'src/modules/thing/thing.service';
import { SaveThingDto } from 'src/shared/dto/request/thing/create.request';
import { ListThingDto } from 'src/shared/dto/request/thing/list.request';
import { ApiOkResponsePaginated } from 'src/shared/dto/response/pagination/base.decorator';
import { SaveThingResponse } from 'src/shared/dto/response/thing/create.response';
import { ThingResponse } from 'src/shared/dto/response/thing/detail.response';
import { ThingInterceptor } from 'src/shared/interceptors/thing.interceptor';
import { ROLE, UserModel } from 'src/shared/models/user.model';
import { ApiOkResponseBase } from 'src/shared/utils/swagger.utils';

@ApiTags('thing')
@Controller('thing')
@UseGuards(RolesGuard)
export class ThingController {
  constructor(private readonly thingService: ThingService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(ThingInterceptor)
  @ApiOkResponseBase(SaveThingResponse)
  @ApiBody({ type: SaveThingDto })
  @HttpCode(200)
  @Roles([ROLE.ADMIN])
  async create(
    @Body() body: SaveThingDto,
    @User() user: UserModel,
  ): Promise<SaveThingResponse> {
    return await this.thingService.create(body, user);
  }

  @Put('/:thingId')
  @ApiBearerAuth()
  @ApiOkResponseBase(SaveThingResponse)
  @ApiBody({ type: SaveThingDto })
  @HttpCode(200)
  @Roles([ROLE.ADMIN])
  async update(
    @Param('thingId') thingId: string,
    @Body() body: SaveThingDto,
    @User() user: UserModel,
  ): Promise<SaveThingResponse> {
    return await this.thingService.update(new ObjectId(thingId), body, user);
  }

  @Get('certificate/:thingId')
  @ApiBearerAuth()
  @UseInterceptors(ThingInterceptor)
  @HttpCode(200)
  @Roles([ROLE.ADMIN])
  async updateCertificate(
    @Param('thingId') thingId: string,
    @User() user: UserModel,
  ): Promise<SaveThingResponse> {
    return await this.thingService.updateCertificate(
      new ObjectId(thingId),
      user,
    );
  }

  @Get('/:thingId')
  @ApiBearerAuth()
  @ApiOkResponseBase(ThingResponse)
  async detail(@Param('thingId') thingId: string, @User() user: UserModel) {
    return await this.thingService.detail(new ObjectId(thingId), user);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOkResponsePaginated(ThingResponse)
  async list(@Query() query: ListThingDto, @User() user: UserModel) {
    return await this.thingService.list(query, user);
  }

  // controller to delete thing
  @Delete('/:thingId')
  @ApiBearerAuth()
  @HttpCode(200)
  @Roles([ROLE.ADMIN])
  async delete(@Param('thingId') thingId: string, @User() user: UserModel) {
    return await this.thingService.delete(new ObjectId(thingId), user);
  }
}
