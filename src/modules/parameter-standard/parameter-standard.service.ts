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
import { CreateParameterStandardDto } from 'src/shared/dto/request/parameter-standard/create.request';
import { ParameterStandardModel } from 'src/shared/models/parameter-standard.model';
import { ListParameterStandardDto } from 'src/shared/dto/request/parameter-standard/list.request';
import { findRelative } from 'src/shared/utils/find-relative.utils';

@Injectable()
export class ParameterStandardService {
  private readonly logger: Logger = new Logger(ParameterStandardService.name);
  constructor(
    @InjectCollection(NormalCollection.PARAMETER_STANDARD)
    private readonly parameterStandardCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
  ) {}

  async create(dto: CreateParameterStandardDto, user: UserModel) {
    const session = this.client.startSession();
    try {
      const { name, unit, weight, thresholds } = dto;
      session.startTransaction();
      // validate
      if (user.role !== ROLE.ADMIN) {
        throw new UnauthorizedException('no-permission');
      }
      const nameIsExist = await this.paramerterNameExist(name, null, session);
      if (nameIsExist) {
        throw new BadRequestException('parameter-name-exist');
      }

      const parameterStandard = new ParameterStandardModel();
      parameterStandard.name = name;
      parameterStandard.unit = unit;
      parameterStandard.weight = weight;
      parameterStandard.thresholds = thresholds;

      await this.parameterStandardCollection.insertOne(parameterStandard, {
        session,
      });

      await session.commitTransaction();

      return 'create-parameter-standard-success';
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
    parameterStandardId: ObjectId,
    dto: CreateParameterStandardDto,
    user: UserModel,
  ) {
    const session = this.client.startSession();
    try {
      const { name, unit, weight, thresholds } = dto;
      session.startTransaction();
      if (user.role !== ROLE.ADMIN) {
        throw new UnauthorizedException('no-permission');
      }
      const nameIsExist = await this.paramerterNameExist(
        name,
        parameterStandardId,
        session,
      );
      if (nameIsExist) {
        throw new BadRequestException('parameter-name-exist');
      }

      await this.parameterStandardCollection.updateOne(
        {
          _id: parameterStandardId,
        },
        {
          $set: {
            name,
            unit,
            weight,
            thresholds,
          },
        },
        { session },
      );

      await session.commitTransaction();

      return 'update-parameter-standard-success';
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async list({
    q,
    skip,
    page,
    limit,
    sortBy,
    sortOrder,
  }: ListParameterStandardDto) {
    try {
      const match = { $and: [] };
      if (q)
        match['$and'].push({
          $or: [{ name: findRelative(q) }, { unit: findRelative(q) }],
        });

      !match['$and'].length && delete match['$and'];

      const parameterStandards = await this.parameterStandardCollection
        .aggregate([
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

      return parameterStandards[0];
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async listParameterNames() {
    try {
      const parameterNames = await this.parameterStandardCollection
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

  async deleteParameterStandard(parameterStandardId: ObjectId) {
    try {
      const isExist = await this.parameterStandardCollection.findOne({
        _id: parameterStandardId,
      });
      if (!isExist) {
        throw new NotFoundException('parameter-standard-not-exist');
      }

      await this.parameterStandardCollection.deleteOne({
        _id: parameterStandardId,
      });

      return 'delete-parameter-standard-success';
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  async paramerterNameExist(
    parameterName: string,
    parameterStandardId?: ObjectId,
    session?: ClientSession,
  ) {
    const parameterStandard = (await this.parameterStandardCollection.findOne(
      {
        name: parameterName,
      },
      { session },
    )) as ParameterStandardModel;

    if (
      parameterStandard &&
      parameterStandard._id.toString() !== parameterStandardId.toString()
    ) {
      return true;
    }
    return false;
  }
}
