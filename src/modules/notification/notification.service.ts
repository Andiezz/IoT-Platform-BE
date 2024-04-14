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
import {
  CreateExceedThresholdNotificationDto,
  Parameter,
} from 'src/shared/dto/request/notification/create.request';
import { PARAMETER_MESSAGE } from '../thing/thing.constant';
import { concatenatePropertyHasValueStringInObjectArray } from 'src/shared/utils/array.utils';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class NotificationService {
  private readonly logger: Logger = new Logger(NotificationService.name);
  constructor(
    @InjectCollection(NormalCollection.NOTIFICATION)
    private readonly notificationCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
    private thingService: ThingService,
    private readonly socketGateway: SocketGateway,
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

      const notifications: NotificationModel[] = [];
      dtos.forEach((dto) => {
        const aboveStandardParameters = [];
        const belowStandardParameters = [];
        dto.parameters.forEach((parameter) => {
          // check parameter
          if (!parameter?.value) {
            return;
          }
          if (parameter.message === PARAMETER_MESSAGE.ABOVE_STANDARD) {
            aboveStandardParameters.push({
              name: parameter.name,
              value: parameter.value,
              unit: parameter.unit,
            });
          } else if (parameter.message === PARAMETER_MESSAGE.BELOW_STANDARD) {
            belowStandardParameters.push({
              name: parameter.name,
              value: parameter.value,
              unit: parameter.unit,
            });
          }
        });

        // create notification for corresponding parameter message
        if (aboveStandardParameters.length > 0) {
          const concatenatedParameterName =
            concatenatePropertyHasValueStringInObjectArray(
              aboveStandardParameters,
              ', ',
              'name',
            );
          const concatenatedParameterValue =
            concatenatePropertyHasValueStringInObjectArray(
              aboveStandardParameters,
              ', ',
              'value',
              'unit',
            );
          const aboveStandardNotification = new NotificationModel();
          aboveStandardNotification.title = TITLE.EXCEED_THRESHOLD;
          aboveStandardNotification.content = this.generateContent(
            CONTENT.ABOVE_STANDARD,
            thingId.toString(),
            dto.deviceName,
            concatenatedParameterName,
            concatenatedParameterValue,
          );
          aboveStandardNotification.type = TYPE.WARNING;
          aboveStandardNotification.receivers = receivers.map((receiver) => {
            return {
              userId: receiver,
              readAt: null,
            };
          });
          notifications.push(aboveStandardNotification);
        }

        if (belowStandardParameters.length > 0) {
          const belowStandardNotification = new NotificationModel();
          belowStandardNotification.title = TITLE.EXCEED_THRESHOLD;
          belowStandardNotification.content = this.generateContent(
            CONTENT.BELOW_STANDARD,
            thingId.toString(),
            dto.deviceName,
            concatenatePropertyHasValueStringInObjectArray(
              belowStandardParameters,
              ', ',
              'name',
            ),
            concatenatePropertyHasValueStringInObjectArray(
              belowStandardParameters,
              ', ',
              'value',
              'unit',
            ),
          );
          belowStandardNotification.type = TYPE.WARNING;
          belowStandardNotification.receivers = receivers.map((receiver) => {
            return {
              userId: receiver,
              readAt: null,
            };
          });
          notifications.push(belowStandardNotification);
        }
      });

      if (notifications.length === 0) {
        this.logger.log('no-notification-need');
        return;
      }

      await this.notificationCollection.insertMany(notifications, { session });

      // publish notification socket
      await this.socketGateway.publish(`/thing-warning/${thingId.toString()}`, {
        channel: 'thing-warning-process',
        data: notifications,
      });

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
          _id: notificationId,
          'receivers.userId': user._id,
        },
        {
          $set: {
            'receivers.$.readAt': new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();

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
          'receivers.userId': user._id,
        },
        {
          $set: {
            'receivers.$.readAt': new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();

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
    const notifications = await this.notificationCollection
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
      .toArray();

    const totalUnread = notifications[0]?.paginatedResults.filter(
      (notification) => {
        return notification?.readAt === null;
      },
    ).length;

    const response = {
      ...notifications[0],
      totalUnread,
    };
    return response;
  }

  async getThingWarnings(thingId: ObjectId) {
    const notifications = await this.notificationCollection
      .aggregate([
        {
          $match: {
            content: { $regex: thingId.toString() },
          },
        },
      ])
      .toArray();

    return notifications[0];
  }

  async classifyTypeAndTitle(thingId: ObjectId, message: ThingData) {
    const devices = await this.thingService.listDevices(thingId);

    const validateParameterDevices = this.thingService.validateThingData(
      message,
      devices,
    );
    const createNotificationDtos = validateParameterDevices.map((device) => {
      const createNotificationDto = new CreateExceedThresholdNotificationDto();
      createNotificationDto.deviceName = device.name;
      createNotificationDto.parameters =
        device.parameterStandards as Parameter[];
      return createNotificationDto;
    });

    return createNotificationDtos;
  }

  generateContent(content: string, ...args: string[]) {
    console.log(args);
    args.forEach((arg, index) => {
      content = content.replace(`$${index + 1}`, arg);
    });
    return content;
  }
}
