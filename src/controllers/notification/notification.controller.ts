import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Put,
  Query,
  HttpCode,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { UserModel } from 'src/shared/models/user.model';
import { ListNotificationDto } from 'src/shared/dto/request/notification/list.request';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NormalizeListNotificationPipe } from 'src/shared/dto/request/notification/normalize-list.pipe';
import { ObjectId } from 'mongodb';
import { UpdateNotificationDto } from 'src/shared/dto/request/notification/update.request';

@ApiTags('notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('view')
  @ApiBearerAuth()
  @HttpCode(200)
  public async listNotifications(
    @Query(NormalizeListNotificationPipe) query: ListNotificationDto,
    @User() user: UserModel,
  ) {
    try {
      return await this.notificationService.list(query, user);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Put('update/:notificationId')
  @ApiBearerAuth()
  @HttpCode(200)
  async updateOne(
    @Param('notificationId') notificationId: string,
    @User() user: UserModel,
  ) {
    try {
      return await this.notificationService.updateOne(
        new ObjectId(notificationId),
        user,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Put('update')
  @ApiBearerAuth()
  async updateAll(
    @Body() updateNotificationDto: UpdateNotificationDto,
    @User() user: UserModel,
  ) {
    try {
      return await this.notificationService.updateMany(
        updateNotificationDto,
        user,
      );
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
