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
    deviceName: string,
    parameter: string,
    value: string,
    unit: string,
  ) {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      const thing = await this.thingService.isExist({ _id: thingId }, session);
      const receivers = thing.managers.map((manager) => {
        return manager.userId;
      });

      const notification = new NotificationModel();
      notification.title = TITLE.EXCEED_THRESHOLD;
      notification.content = this.generateContent(
        CONTENT.EXCEED_THRESHOLD,
        thingId.toString(),
        deviceName,
        parameter,
        value,
        unit,
      );
      notification.type = TYPE.WARNING;
      notification.receivers = receivers.map((receiver) => {
        return {
          userId: receiver,
          readAt: null,
        };
      });

      await this.notificationCollection.insertOne(notification, { session });

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

  generateContent(content: string, ...args: string[]) {
    args.forEach((arg, index) => {
      content.replace(`$${index + 1}`, arg);
    });
    return content;
  }
}
