import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { MongoClient, ObjectId } from 'mongodb';
import { InjectClient } from 'src/modules/mongodb';
import { ConfigService } from '@nestjs/config';
import { UserModel } from 'src/shared/models/user.model';
import { ThingService } from '../thing/thing.service';
import { GetDashboardDto } from 'src/shared/dto/request/dashboard/get-dashboard.request';
import { CHART_TYPE } from 'src/shared/constants/dashboard.constants';
import { NotificationService } from '../notification/notification.service';
import {
  GetDashboardResponse,
  TimeseriesData,
} from 'src/shared/dto/response/dashboard/dashboard.response';
import { ThingModel } from 'src/shared/models/thing.model';
import { getParameterThreshold } from '../thing/thing.constant';
import { checkValueExistInObjectArray } from 'src/shared/utils/array.utils';
import { ThingData } from '../iot-consumer/iot-consumer.interface';
import {
  calculateOverallIndoorAirQualityIndex,
  convertParameterValueToIAQI,
} from '../parameter-standard/parameter-standard.constants';
import { TYPE } from '../notification/template-notification';
import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
import * as  moment from 'moment';

@Injectable()
export class DashboardService {
  private readonly logger: Logger = new Logger(DashboardService.name);
  constructor(
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
  ): Promise<GetDashboardResponse> {
    try {
      const { from, to } = getDashboardDto;
      // I. Validate data and permissions
      // I.1 Validate query
      if (from > to) {
        throw new BadRequestException('bad-from-to-query');
      }

      // I.2 Validate thing and thing manager
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
      const getThingDetailPromise = this.getThingDetail(thingId, user, {
        createdBy: 0,
        updatedBy: 0,
        createdOn: 0,
        updatedOn: 0,
      });

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
        thingDetail,
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
            tvoc: { $avg: '$tvoc' },
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

  public async getDailyTimeseriesData(thingId: ObjectId) {
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);

      // generate query parameters
      const match = {};
      match['metadata.thingId'] = thingId.toString();
      match['timestamp'] = {
        $gte: moment().startOf('day').toDate(),
        $lte: moment().endOf('day').toDate(),
      };

      const groupPipeline = [
        {
          $group: {
            _id: {
              thingId: '$metadata.thingId',
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
            tvoc: { $avg: '$tvoc' },
            count: { $sum: 1 },
          },
        },
      ];

      const dailyTimeseriesData = (await db
        .collection(`${thingId.toString()}_timeseries_data`)
        .aggregate([
          {
            $match: match,
          },
          ...groupPipeline,
        ])
        .toArray()) as TimeseriesData[];

      return dailyTimeseriesData;
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
            tvoc: { $avg: '$tvoc' },
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

      const iaqResult = await this.calculateReport(timeseriesData[0], thing);

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

  public async getThingDetail(
    thingId: ObjectId,
    user: UserModel,
    excludeFields: object,
  ) {
    try {
      const thing = await this.thingService.detail(
        thingId,
        user,
        excludeFields,
      );
      return thing;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async calculateReport(
    timeseriesData: TimeseriesData,
    thing: ThingModel,
  ) {
    const thingData: ThingData = {
      ...timeseriesData,
      metadata: {
        thingId: thing._id.toString(),
      },
    };
    const evaluatedParameters =
      await this.notificationService.classifyTypeAndTitle(thing._id, thingData);

    // evaluate quality
    const acceptableSubstances: EvaluatedParameter[] = [];
    const unAcceptableSubstances: EvaluatedParameter[] = [];
    evaluatedParameters.forEach((evaluatedParameter) => {
      const { type } = evaluatedParameter;
      const iaqiValue = convertParameterValueToIAQI(evaluatedParameter);

      if (type === TYPE.WARNING) {
        unAcceptableSubstances.push({
          ...evaluatedParameter,
          iaqiValue,
        } as EvaluatedParameter);
      } else if (type === TYPE.NORMAL) {
        acceptableSubstances.push({
          ...evaluatedParameter,
          iaqiValue,
        } as EvaluatedParameter);
      }
    });

    // calculate general iaqi
    const generalIaqi = calculateOverallIndoorAirQualityIndex([
      ...acceptableSubstances,
      ...unAcceptableSubstances,
    ]);
    const generalIaqiReport = {
      ...getParameterThreshold(generalIaqi),
      generalIaqi
    };

    return {
      generalIaqiReport,
      acceptableSubstances,
      unAcceptableSubstances,
    };
  }
}
