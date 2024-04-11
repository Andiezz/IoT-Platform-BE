import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { InjectClient, InjectCollection } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ConfigService } from '@nestjs/config';
import { UserModel } from 'src/shared/models/user.model';
import { ThingService } from '../thing/thing.service';
import { GetDashboardDto } from 'src/shared/dto/request/dashboard/get-dashboard.request';
import { CHART_TYPE } from 'src/shared/constants/dashboard.constants';
import { NotificationService } from '../notification/notification.service';
import { TimeseriesData } from 'src/shared/dto/response/dashboard/dashboard.response';

@Injectable()
export class DashboardService {
  private readonly logger: Logger = new Logger(DashboardService.name);
  constructor(
    @InjectCollection(NormalCollection.THING)
    private readonly thingCollection: Collection,
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
    private readonly cfg: ConfigService,
    private readonly thingService: ThingService,
    private readonly notificationService: NotificationService,
  ) {}

  // TODO:
  public async getDashboard(getDashboardDto: GetDashboardDto, user: UserModel) {
    // validate user permissions to get thing data
  }

  public async getTimeseriesData(
    thingId: ObjectId,
    getDashboardDto: GetDashboardDto,
  ) {
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      const { from, to, type, timezone } = getDashboardDto;
      // generate query parameters
      const match = {};
      match['metadata.thingId'] = thingId.toString();
      from &&
        to &&
        (match['timestamp'] = {
          $gte: from,
          $lte: to,
        });

      let formatDate;
      switch (type) {
        case CHART_TYPE.DAY:
          formatDate = '%H';
          break;
        case CHART_TYPE.WEEK:
        case CHART_TYPE.MONTH:
          formatDate = '%Y-%m-%d';
          break;
        case CHART_TYPE.YEAR:
          formatDate = '%Y-%m';
          break;
        case CHART_TYPE.TOTAL:
          formatDate = '%Y';
      }

      const groupPipeline = [
        {
          $group: {
            _id: {
              time: {
                $dateToString: {
                  format: formatDate,
                  date: '$timestamp',
                  timezone: timezone,
                },
              },
            },
            co: { $avg: '$co' },
            toluen: { $avg: '$toluen' },
            alcohol: { $avg: '$alcohol' },
            ch4: { $avg: '$ch4' },
            aceton: { $avg: '$aceton' },
            dustDensity: { $avg: '$dustDensity' },
            co2: { $avg: '$co2' },
            humidity: { $avg: '$humidity' },
            lpg: { $avg: '$lpg' },
            temperature: { $avg: '$temperature' },
            nh4: { $avg: '$nh4' },
            count: { $sum: 1 },
          },
        },
      ];

      const setPipeline = [
        {
          $set: {
            time: '$_id.time',
            chartType: type,
          },
        },
        {
          $unset: ['_id'],
        },
      ];

      const timeseriesData = await db
        .collection(`${thingId.toString()}_timeseries_data`)
        .aggregate([
          {
            $match: match,
          },
          ...groupPipeline,
          ...setPipeline,
        ])
        .toArray() as TimeseriesData[];

      return timeseriesData;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async getQualityReport(thingId: ObjectId, user: UserModel) {
    // define quality thresholds standard
  }

  public async getThingWarning(thingId: ObjectId) {
    try {
      const warnings = this.notificationService.getThingWarnings(thingId);
      return warnings;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async getThingDetail(thingId: ObjectId, user: UserModel) {
    try {
      const thing = await this.thingService.detail(thingId, user);
      return thing;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }
}
