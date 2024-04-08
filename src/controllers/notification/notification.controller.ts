import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { User } from 'src/decorators/user.decorator';
import { UserModel } from 'src/shared/models/user.model';
import { ListNotificationDto } from 'src/shared/dto/request/notification/list.request';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NormalizeListNotificationPipe } from 'src/shared/dto/request/notification/normalize-list.pipe';
import { ObjectId } from 'mongodb';

@ApiTags('notification')
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('view')
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
  async updateAll(@User() user: UserModel) {
    try {
      return await this.notificationService.updateAll(user);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
