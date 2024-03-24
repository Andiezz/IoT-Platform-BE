import { Controller, Post, Body, Param, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserManagementService } from 'src/modules/user-management/user-management.service';
import { ActivateAccountDTO } from 'src/shared/dto/request/user-management/activate-account.request';
import { UserUpdateAccountDTO } from 'src/shared/dto/request/user-management/user-update-account.request';
import { ActivateAccountResponse } from 'src/shared/dto/response/user-management/activate-account.response';
import { UserUpdateAccountResponse } from 'src/shared/dto/response/user-management/user-update-account.response';
import { ApiOkResponseBase } from 'src/shared/utils/swagger.utils';

@ApiTags('user management')
@Controller('user-mgt')
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Post('account/activate')
  @ApiBearerAuth()
  @ApiOkResponseBase(ActivateAccountResponse)
  @ApiBody({ type: ActivateAccountDTO })
  async activateAccount(@Body() body: ActivateAccountDTO) {
    return await this.userManagementService.activateAccount(body);
  }

  @Put('account/update/:userId')
  @ApiBearerAuth()
  @ApiOkResponseBase(UserUpdateAccountResponse)
  @ApiBody({ type: UserUpdateAccountDTO })
  async updateAccount(@Param('userId') userId: string, @Body() body: UserUpdateAccountDTO) {
    return await this.userManagementService.updateAccount(userId, body);
  }
}
