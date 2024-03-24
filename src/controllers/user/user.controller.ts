import {
  Body,
  Controller,
  HttpCode,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  FileTypeValidator,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { UserService } from 'src/modules/user/user.service';
import { ChangePasswordDTO } from 'src/shared/dto/request/user/changePassword.request';
import { ChangePasswordResponse } from 'src/shared/dto/response/user/changePassword.response';
import { UpdateProfileDTO } from 'src/shared/dto/request/user/updateProfile.request';
import { UpdateProfileResponse } from 'src/shared/dto/response/user/updateProfile.response';
import { ApiOkResponseBase } from 'src/shared/utils/swagger.utils';
import { GetProfileResponse } from 'src/shared/dto/response/user/getProfile.response';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { ListUsersDTO } from 'src/shared/dto/request/user/list-users.request';
import { ApiOkResponsePaginated } from 'src/shared/dto/response/pagination/base.decorator';
import { AccountResponse } from 'src/shared/dto/response/system-management/list-accounts.response';
import { EmailDTO } from 'src/shared/dto/request/user/email.request';

@ApiTags('user')
@Controller('/user')
export class UserController {
  constructor(private readonly service: UserService) {}

  @Post('change-password')
  @ApiBody({ type: ChangePasswordDTO })
  @ApiOkResponseBase(ChangePasswordResponse)
  @ApiBearerAuth()
  @HttpCode(200)
  public async changePassword(
    @Body() changePasswordDto: ChangePasswordDTO,
    @User('_id') userId: string,
  ): Promise<ChangePasswordResponse> {
    return await this.service.changePassword(userId, changePasswordDto);
  }

  @Get('profile')
  @ApiOkResponseBase(GetProfileResponse)
  @ApiBearerAuth()
  @HttpCode(200)
  public async getProfile(
    @User('_id') userId: string,
  ): Promise<GetProfileResponse> {
    return await this.service.getProfile(userId);
  }

  @Post('update-profile')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateProfileDTO })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponseBase(UpdateProfileResponse)
  @ApiBearerAuth()
  @HttpCode(200)
  public async updateProfile(
    @Body() updateProfileDto: UpdateProfileDTO,
    @User('_id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/ })],
        fileIsRequired: false,
      }),
    )
    file: Express.Multer.File,
  ): Promise<UpdateProfileResponse> {
    return await this.service.updateProfile(userId, updateProfileDto, file);
  }

  @Get('view/list')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOkResponsePaginated(AccountResponse)
  public async getListUser(@Query() query: ListUsersDTO) {
    return this.service.getListUser(query);
  }

  @Post('email')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOkResponsePaginated(AccountResponse)
  public async getUserByEmail(@Body() body: EmailDTO) {
    return this.service.getUserByEmail(body);
  }
}
