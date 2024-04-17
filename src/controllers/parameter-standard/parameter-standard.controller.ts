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
import { ParameterStandardService } from 'src/modules/parameter-standard/parameter-standard.service';
import { CreateParameterStandardDto } from 'src/shared/dto/request/parameter-standard/create.request';
import { ListParameterStandardDto } from 'src/shared/dto/request/parameter-standard/list.request';
import { ROLE, UserModel } from 'src/shared/models/user.model';

@ApiTags('parameter-standard')
@Controller('parameter-standard')
@ApiBearerAuth()
@Roles([ROLE.ADMIN])
export class ParameterStandardController {
  constructor(
    private readonly parameterStandardService: ParameterStandardService,
  ) {}

  @Post()
  @ApiBody({ type: CreateParameterStandardDto })
  @HttpCode(200)
  async create(
    @Body() body: CreateParameterStandardDto,
    @User() user: UserModel,
  ): Promise<string> {
    return await this.parameterStandardService.create(body, user);
  }

  @Put('/:parameterStandardId')
  @ApiBody({ type: CreateParameterStandardDto })
  @HttpCode(200)
  async update(
    @Param('parameterStandardId') parameterStandardId: string,
    @Body() body: CreateParameterStandardDto,
    @User() user: UserModel,
  ): Promise<string> {
    return await this.parameterStandardService.update(
      new ObjectId(parameterStandardId),
      body,
      user,
    );
  }

  @Get()
  @ApiBearerAuth()
  async list(@Query() query: ListParameterStandardDto) {
    return await this.parameterStandardService.list(query);
  }

  @Get('names')
  async listParameterName() {
    return await this.parameterStandardService.listParameterNames();
  }

  @Delete('/:parameterStandardId')
  async delete(@Param('parameterStandardId') parameterStandardId: string) {
    return await this.parameterStandardService.deleteParameterStandard(
      new ObjectId(parameterStandardId),
    );
  }
}
