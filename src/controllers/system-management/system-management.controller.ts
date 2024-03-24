import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Query,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CreateAccountDTO } from 'src/shared/dto/request/system-management/create-account.request';
import { SystemManagementService } from 'src/modules/system-management/system-management.service';
import { ApiOkResponseBase } from 'src/shared/utils/swagger.utils';
import { CreateAccountResponse } from 'src/shared/dto/response/system-management/create-account.response';
import { AdminUpdateAccountDTO } from 'src/shared/dto/request/system-management/admin-update-account.request';
import { AdminUpdateAccountResponse } from 'src/shared/dto/response/system-management/admin-update-account.response';
import { ListAccountsDTO } from 'src/shared/dto/request/system-management/list-accounts.request';
import { AccountResponse } from 'src/shared/dto/response/system-management/list-accounts.response';
import { ApiOkResponsePaginated } from 'src/shared/dto/response/pagination/base.decorator';
import { GetAccountResponse } from 'src/shared/dto/response/system-management/getAccount.response';
import { User } from 'src/decorators/user.decorator';
import { ROLE, UserModel } from 'src/shared/models/user.model';
import { ResentActiveLinkDTO } from 'src/shared/dto/request/authentication/resentActiveLink.request';
import { ResentActiveLinkResponse } from 'src/shared/dto/response/authentication/resentActiveLink.response';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/decorators/roles.decorator';

@ApiTags('system management')
@Controller('system-mgt')
@UseGuards(RolesGuard)
export class SystemManagementController {
  constructor(
    private readonly systemManagementService: SystemManagementService,
  ) {}

  @Post('account/create')
  @ApiBearerAuth()
  @ApiOkResponseBase(CreateAccountResponse)
  @ApiBody({ type: CreateAccountDTO })
  @Roles([ROLE.ADMIN])
  async createAccount(@Body() body: CreateAccountDTO, @User() user: UserModel) {
    return await this.systemManagementService.createAccount(body, user);
  }

  @Put('account/update/:userId')
  @ApiBearerAuth()
  @ApiOkResponseBase(AdminUpdateAccountResponse)
  @ApiBody({ type: AdminUpdateAccountDTO })
  async updateAccount(
    @Param('userId') userId: string,
    @Body() body: AdminUpdateAccountDTO,
    @User() user: UserModel,
  ) {
    return await this.systemManagementService.updateAccount(userId, body, user);
  }

  @Get('account/view')
  @ApiBearerAuth()
  @ApiOkResponsePaginated(AccountResponse)
  async listAccounts(@Query() query: ListAccountsDTO, @User() user: UserModel) {
    return await this.systemManagementService.listAccounts(query, user);
  }

  @Get('view/:accountId')
  @ApiBearerAuth()
  @ApiOkResponseBase(GetAccountResponse)
  public async getAccount(
    @Param('accountId') accountId: string,
  ): Promise<GetAccountResponse> {
    return await this.systemManagementService.getAccount(accountId);
  }

  @Post('account/resent-active-link')
  @ApiBody({ type: ResentActiveLinkDTO })
  @ApiBearerAuth()
  @ApiOkResponseBase(ResentActiveLinkResponse)
  public async resentActiveLink(
    @Body() resentActiveLinkDto: ResentActiveLinkDTO,
  ): Promise<ResentActiveLinkResponse> {
    return await this.systemManagementService.resentActiveLink(
      resentActiveLinkDto,
    );
  }
}
