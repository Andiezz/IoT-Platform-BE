import {
  Body,
  Controller,
  Post,
  UseInterceptors,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { ThingService } from 'src/modules/thing/thing.service';
import { CreateThingDto } from 'src/shared/dto/request/thing/create.request';
import { CreateThingResponse } from 'src/shared/dto/response/thing/create.response';
import { ThingInterceptor } from 'src/shared/interceptors/thing.interceptor';
import { UserModel } from 'src/shared/models/user.model';
import { ApiOkResponseBase } from 'src/shared/utils/swagger.utils';

@ApiTags('thing')
@Controller('thing')
export class ThingController {
  constructor(private readonly thingService: ThingService) {}

  @Post('create')
  @ApiBearerAuth()
  @UseInterceptors(ThingInterceptor)
  @ApiOkResponseBase(CreateThingResponse)
  @ApiBody({ type: CreateThingDto })
  @HttpCode(200)
  async create(
    @Body() body: CreateThingDto,
    @User() user: UserModel,
  ): Promise<CreateThingResponse> {
    return await this.thingService.create(body, user);
  }
}
