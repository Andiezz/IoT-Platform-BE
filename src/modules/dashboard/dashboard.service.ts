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
import { ThingModel } from 'src/shared/models/thing.model';
import {
  PARAMETER_NAME,
  PARAMETER_THRESHOLD_NAME,
  PARAMETER_WEIGHT,
} from '../thing/thing.constant';
import { checkValueExistInObjectArray } from 'src/shared/utils/array.utils';
import { ThingData } from '../iot-consumer/iot-consumer.interface';
import { convertParameterValueToIAQI } from '../parameter-standard/parameter-standard.constants';

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

  public async getDashboard(
    thingId: ObjectId,
    getDashboardDto: GetDashboardDto,
    user: UserModel,
  ) {
    try {
      const { from, to } = getDashboardDto;
      // I. Validate data and permissions
      // I.1 Validate query
      if (from > to) {
        throw new BadRequestException('bad-from-to-query');
      }

      // I.2 Validate thing and thing owner
      const thing = await this.thingService.isExist({ _id: thingId });
      if (!checkValueExistInObjectArray(thing.managers, 'userId', user._id)) {
        throw new BadRequestException('no-permission');
      }

      // II. Get dashboard info
      // II.1 Get timeseries data, thing detail, thing warning
      const getTimeseriesDataPromise = this.getTimeseriesData(
        thingId,
        getDashboardDto,
      );

      // II.2 Get thing detail
      const getThingDetailPromise = this.getThingDetail(thingId, user);

      // II.3 Get thing warning
      const getThingWarningPromise = this.getThingWarning(thingId);

      const [timeseriesData, thingDetail, thingWarning] = await Promise.all([
        getTimeseriesDataPromise,
        getThingDetailPromise,
        getThingWarningPromise,
      ]);

      // II.4 Get thing quality report
      const qualityReport = await this.getQualityReport(
        thingId,
        getDashboardDto,
        thingDetail as ThingModel,
      );

      return {
        timeseriesData,
        thingWarning,
        thingDetail,
        qualityReport,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
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

      let formatDate: string;
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
        {
          $sort: {
            time: 1,
          },
        },
      ];

      const timeseriesData = (await db
        .collection(`${thingId.toString()}_timeseries_data`)
        .aggregate([
          {
            $match: match,
          },
          ...groupPipeline,
          ...setPipeline,
        ])
        .toArray()) as TimeseriesData[];

      return timeseriesData;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async getQualityReport(
    thingId: ObjectId,
    getDashboardDto: GetDashboardDto,
    thing: ThingModel,
  ) {
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      const { from, to } = getDashboardDto;
      // generate query parameters
      const match = {};
      match['metadata.thingId'] = thingId.toString();
      from &&
        to &&
        (match['timestamp'] = {
          $gte: from,
          $lte: to,
        });

      const groupPipeline = [
        {
          $group: {
            _id: null,
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

      const timeseriesData = (await db
        .collection(`${thingId.toString()}_timeseries_data`)
        .aggregate([
          {
            $match: match,
          },
          ...groupPipeline,
        ])
        .toArray()) as TimeseriesData[];

      const iaqResult = this.calculateReport(timeseriesData[0], thing);

      return {
        iaqResult,
        timeseriesData,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async getThingWarning(thingId: ObjectId) {
    try {
      const warnings = await this.notificationService.getThingWarnings(thingId);
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

  // TODO: - Calculate general iaqi - TVOC evaluation
  public async calculateReport(
    timeseriesData: TimeseriesData,
    thing: ThingModel,
  ) {
    const thingData: ThingData = {
      ...timeseriesData,
      thingId: thing._id.toString(),
    };
    const evaluatedParameters =
      await this.notificationService.classifyTypeAndTitle(thing._id, thingData);

    // evaluate quality
    let tVOC = 0;
    const acceptableSubstances = [];
    const unAcceptableSubstances = [];
    const tVOCSubstances = [];
    evaluatedParameters.forEach((evaluatedParameter, i) => {
      const { name, value, threshold } = evaluatedParameter;
      const iaqiValue = convertParameterValueToIAQI(evaluatedParameter);

      // evaluate tVOC
      if (
        [
          PARAMETER_NAME.Aceton.toString(),
          PARAMETER_NAME.Alcohol.toString(),
          PARAMETER_NAME.LPG.toString(),
          PARAMETER_NAME.Toluen.toString(),
        ].includes(name)
      ) {
        tVOCSubstances.push(evaluatedParameter);
        tVOC += value;
        return;
      }

      if (
        [
          PARAMETER_THRESHOLD_NAME.UNHEALTHY.toString(),
          PARAMETER_THRESHOLD_NAME.VERT_UNHEALTHY.toString(),
          PARAMETER_THRESHOLD_NAME.HARZARDOUS.toString(),
        ].includes(threshold.name)
      ) {
        unAcceptableSubstances.push({ evaluatedParameter, iaqiValue });
        return;
      } else if (
        [
          PARAMETER_THRESHOLD_NAME.GOOD.toString(),
          PARAMETER_THRESHOLD_NAME.MODERATE.toString(),
          PARAMETER_THRESHOLD_NAME.SENSITIVE_UNHEALTHY.toString(),
        ].includes(threshold.name)
      ) {
        acceptableSubstances.push({ evaluatedParameter, iaqiValue });
        return;
      }

      if (i === evaluatedParameters.length - 1) {
        tVOC
        unAcceptableSubstances.push(...tVOCSubstances);
      }
    });

    // TODO: calculate general iaqi

    return {
      qualityResult,
      acceptableSubstances,
      unAcceptableSubstances,
    };
  }
}
