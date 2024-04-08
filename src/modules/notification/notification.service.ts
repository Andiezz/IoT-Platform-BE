import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectClient, InjectCollection } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { NotificationModel } from 'src/shared/models/notification.model';
import { CONTENT, TITLE, TYPE } from './template-notification';
import { ThingService } from '../thing/thing.service';
import { ListNotificationDto } from 'src/shared/dto/request/notification/list.request';
import { UserModel } from 'src/shared/models/user.model';
import { UpdateNotificationDto } from 'src/shared/dto/request/notification/update.request';
import { ThingData } from '../iot-consumer/iot-consumer.interface';
import { CreateExceedThresholdNotificationDto } from 'src/shared/dto/request/notification/create.request';
import { PARAMETER_MESSAGE } from '../thing/thing.constant';

@Injectable()
export class NotificationService {
  private readonly logger: Logger = new Logger(NotificationService.name);
  constructor(
    @InjectCollection(NormalCollection.NOTIFICATION)
    private readonly notificationCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
    private thingService: ThingService,
  ) {}

  async createExceedThresholdNotification(
    thingId: ObjectId,
    dtos: CreateExceedThresholdNotificationDto[],
  ) {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      const thing = await this.thingService.isExist({ _id: thingId }, session);
      const receivers = thing.managers.map((manager) => {
        return manager.userId;
      });

      const notifications: NotificationModel[] = dtos
        .map((dto) => {
          return dto.parameters.map((parameter) => {
            if (parameter.message === PARAMETER_MESSAGE.ABOVE_STANDARD) {
              const notification = new NotificationModel();
              notification.title = TITLE.EXCEED_THRESHOLD;
              notification.content = this.generateContent(
                CONTENT.ABOVE_STANDARD,
                thingId.toString(),
                dto.deviceName,
                parameter.name,
                parameter.value,
                parameter.unit,
              );
              notification.type = parameter.type;
              notification.receivers = receivers.map((receiver) => {
                return {
                  userId: receiver,
                  readAt: null,
                };
              });
              return notification;
            } else if (parameter.message === PARAMETER_MESSAGE.BELOW_STANDARD) {
              const notification = new NotificationModel();
              notification.title = TITLE.EXCEED_THRESHOLD;
              notification.content = this.generateContent(
                CONTENT.BELOW_STANDARD,
                thingId.toString(),
                dto.deviceName,
                parameter.name,
                parameter.value,
                parameter.unit,
              );
              notification.type = parameter.type;
              notification.receivers = receivers.map((receiver) => {
                return {
                  userId: receiver,
                  readAt: null,
                };
              });
              return notification;
            } else {
              return null;
            }
          });
        })
        .flat(1);

      await this.notificationCollection.insertMany(notifications, { session });

      //TODO: publish socket

      await session.commitTransaction();

      this.logger.log('push-notification-success');
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async updateOne(notificationId: ObjectId, user: UserModel) {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      await this.notificationCollection.updateMany(
        {
          $match: {
            _id: notificationId,
            $expr: { $in: [user._id, '$receivers.userId'] },
          },
        },
        {
          $set: { readAt: new Date() },
        },
        { session },
      );

      return 'update-notification-success';
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async updateAll(user: UserModel) {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      await this.notificationCollection.updateMany(
        {
          $expr: { $in: [user._id, '$receivers.userId'] },
        },
        {
          $set: { readAt: new Date() },
        },
        { session },
      );

      return 'update-all-notification-success';
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async list(
    { skip, page, limit, sortBy, sortOrder }: ListNotificationDto,
    user: UserModel,
  ) {
    const notifications = (await this.notificationCollection
      .aggregate([
        {
          $match: {
            $expr: { $in: [user._id, '$receivers.userId'] },
          },
        },
        {
          $set: { readAt: '$receivers.readAt' },
        },
        { $sort: { [`${sortBy}`]: sortOrder } },
        {
          $facet: {
            paginatedResults: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
        {
          $set: {
            page,
            limit,
            total: { $first: '$totalCount.count' },
          },
        },
        { $unset: 'totalCount' },
      ])
      .toArray()) as NotificationModel[][];

    const totalUnread = notifications[0].filter((notification) => {
      return notification?.readAt === null;
    }).length;

    const response = {
      ...notifications[0],
      totalUnread,
    };
    return response;
  }

  async classifyTypeAndTitle(thingId: ObjectId, message: ThingData) {
    const devices = await this.thingService.listDevices(thingId);

    const validateParameterInfo = this.thingService.validateThingData(
      message,
      devices,
    );
    const deviceParameterStandardInfo = validateParameterInfo.map((device) => {
      const standardInfo = device.parameterStandards.map((reportStandard) => {
        if (reportStandard['message'] === PARAMETER_MESSAGE.STANDARD) {
          return;
        }
        const exceedThresholdInfo = new CreateExceedThresholdNotificationDto();
        exceedThresholdInfo.deviceName = reportStandard.name;
        exceedThresholdInfo.parameter = reportStandard.name;
        exceedThresholdInfo.value = reportStandard['value'];
        exceedThresholdInfo.unit = reportStandard.unit;
        exceedThresholdInfo.message = reportStandard['message'];
        exceedThresholdInfo.type = reportStandard['type'];
        return exceedThresholdInfo;
      });
      return standardInfo;
    });
  }

  generateContent(content: string, ...args: string[]) {
    args.forEach((arg, index) => {
      content.replace(`$${index + 1}`, arg);
    });
    return content;
  }
}
