import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectClient, InjectCollection } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { NotificationModel } from 'src/shared/models/notification.model';
import {
  CONTENT,
  TITLE,
  TYPE,
  formatTemplateContentArgument,
} from './template-notification';
import { ThingService } from '../thing/thing.service';
import { ListNotificationDto } from 'src/shared/dto/request/notification/list.request';
import { UserModel } from 'src/shared/models/user.model';
import { ThingData } from '../iot-consumer/iot-consumer.interface';
import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
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

  async createWarningThresholdNotificationDto(
    thingId: ObjectId,
    evaluatedParameters: EvaluatedParameter[],
  ) {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      const thing = await this.thingService.isExist({ _id: thingId }, session);
      const receivers = thing.managers.map((manager) => {
        return manager.userId;
      });

      // create notification
      const warningThresholdNotification = new NotificationModel();
      warningThresholdNotification.title = TITLE.EXCEED_THRESHOLD;
      const templateContentArgument =
        formatTemplateContentArgument(evaluatedParameters);
      warningThresholdNotification.content = this.generateContent(
        CONTENT.WARNING_THRESHOLD,
        thingId.toString(),
        templateContentArgument,
      );
      warningThresholdNotification.type = TYPE.WARNING;
      warningThresholdNotification.receivers = receivers.map((receiver) => {
        return {
          userId: receiver,
          readAt: null,
        };
      });

      await this.notificationCollection.insertOne(
        warningThresholdNotification,
        { session },
      );

      // publish notification socket
      await this.socketGateway.publish(`/thing-warning/${thingId.toString()}`, {
        channel: 'thing-warning-process',
        data: warningThresholdNotification,
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

    return notifications[0] as NotificationModel;
  }

  async classifyTypeAndTitle(thingId: ObjectId, data: ThingData) {
    const devices = await this.thingService.listDevices(thingId);

    const validateParameterDevices = this.thingService.validateThingData(
      data,
      devices,
    );
    const evaluatedParameters: EvaluatedParameter[] = [];
    validateParameterDevices.forEach((device) => {
      evaluatedParameters.push(...device.evaluatedParameterStandards);
    });

    return evaluatedParameters;
  }

  generateContent(content: string, ...args: string[]) {
    console.log(args);
    args.forEach((arg, index) => {
      content = content.replace(`$${index + 1}`, arg);
    });
    return content;
  }
}
