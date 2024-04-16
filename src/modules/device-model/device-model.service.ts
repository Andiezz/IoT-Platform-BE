import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectClient, InjectCollection } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ClientSession, Collection, MongoClient, ObjectId } from 'mongodb';
import { ROLE, UserModel } from 'src/shared/models/user.model';
import { DeviceModel } from 'src/shared/models/device-model.model';
import { CreateDeviceModelDto } from 'src/shared/dto/request/device-model/create.request';
import { ListDeviceModelDto } from 'src/shared/dto/request/device-model/list.request';
import { findRelative } from 'src/shared/utils/find-relative.utils';

@Injectable()
export class DeviceModelService {
  private readonly logger: Logger = new Logger(DeviceModelService.name);
  constructor(
    @InjectCollection(NormalCollection.DEVICE_MODEL)
    private readonly deviceModelCollection: Collection,
    @InjectCollection(NormalCollection.PARAMETER_STANDARD)
    private readonly parameterStandardCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
  ) {}

  async create(dto: CreateDeviceModelDto, user: UserModel) {
    const session = this.client.startSession();
    try {
      const { name, information, type, parameterStandards } = dto;
      session.startTransaction();
      // validate
      if (user.role !== ROLE.ADMIN) {
        throw new UnauthorizedException('no-permission');
      }
      const nameIsExist = await this.deviceModelExist(name, null, session);
      if (nameIsExist) {
        throw new BadRequestException('device-model-name-exist');
      }
      const parameterStandardExist = await this.parameterStandardCollection
        .find({
          _id: { $in: parameterStandards },
        })
        .toArray();
      if (parameterStandardExist.length !== parameterStandards.length) {
        throw new BadRequestException('parameter-not-found');
      }

      const deviceModel = new DeviceModel();
      deviceModel.name = name;
      deviceModel.information = information;
      deviceModel.type = type;
      deviceModel.parameterStandards = parameterStandards;

      await this.deviceModelCollection.insertOne(deviceModel, {
        session,
      });

      await session.commitTransaction();

      return 'create-device-model-success';
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async update(
    deviceModelId: ObjectId,
    dto: CreateDeviceModelDto,
    user: UserModel,
  ) {
    const session = this.client.startSession();
    try {
      const { name, information, type, parameterStandards } = dto;
      session.startTransaction();
      if (user.role !== ROLE.ADMIN) {
        throw new UnauthorizedException('no-permission');
      }
      const nameIsExist = await this.deviceModelExist(
        name,
        deviceModelId,
        session,
      );
      if (nameIsExist) {
        throw new BadRequestException('device-model-name-exist');
      }
      const parameterStandardExist = await this.parameterStandardCollection
        .find({
          _id: { $in: parameterStandards },
        })
        .toArray();
      if (parameterStandardExist.length !== parameterStandards.length) {
        throw new BadRequestException('parameter-not-found');
      }

      await this.deviceModelCollection.updateOne(
        {
          _id: deviceModelId,
        },
        {
          $set: {
            name,
            information,
            type,
            parameterStandards,
          },
        },
        { session },
      );

      await session.commitTransaction();

      return 'update-device-model-success';
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async list({ q, skip, page, limit, sortBy, sortOrder }: ListDeviceModelDto) {
    try {
      const match = { $and: [] };
      if (q)
        match['$and'].push({
          $or: [
            { name: findRelative(q) },
            { type: findRelative(q) },
            { 'parameterStandards.name': findRelative(q) },
          ],
        });

      !match['$and'].length && delete match['$and'];

      const deviceModels = await this.deviceModelCollection
        .aggregate([
          {
            $lookup: {
              from: NormalCollection.PARAMETER_STANDARD,
              localField: 'parameterStandards',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    unit: 1,
                    weight: 1,
                    thresholds: 1,
                  },
                },
              ],
              as: 'parameterStandards',
            },
          },
          { $match: match },
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

      return deviceModels[0];
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async listDeviceModelNames() {
    try {
      const parameterNames = await this.deviceModelCollection
        .find(
          {},
          {
            projection: {
              name: 1,
              _id: 1,
            },
          },
        )
        .toArray();

      return parameterNames;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async getDeviceModel(deviceModelId: ObjectId) {
    try {
      const deviceModel = await this.deviceModelCollection
        .aggregate([
          {
            $match: {
              _id: deviceModelId,
            },
          },
          {
            $lookup: {
              from: NormalCollection.PARAMETER_STANDARD,
              localField: 'parameterStandards',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    name: 1,
                    unit: 1,
                    weight: 1,
                    thresholds: 1,
                  },
                },
              ],
              as: 'parameterStandards',
            },
          },
        ])
        .toArray();
      if (!deviceModel[0]) {
        throw new NotFoundException('device-model-not-exist');
      }

      return deviceModel[0];
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async deleteDeviceModel(deviceModelId: ObjectId) {
    try {
      const isExist = await this.deviceModelCollection.findOne({
        _id: deviceModelId,
      });
      if (!isExist) {
        throw new NotFoundException('device-model-not-exist');
      }

      await this.deviceModelCollection.deleteOne({
        _id: deviceModelId,
      });

      return 'delete-device-model-success';
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async deviceModelExist(
    deviceModelName: string,
    deviceModelId?: ObjectId,
    session?: ClientSession,
  ) {
    const deviceModel = (await this.deviceModelCollection.findOne(
      {
        name: deviceModelName,
      },
      { session },
    )) as DeviceModel;

    if (
      deviceModel &&
      deviceModel._id.toString() !== deviceModelId.toString()
    ) {
      return true;
    }
    return false;
  }
}
