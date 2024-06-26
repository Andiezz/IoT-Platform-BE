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
import * as moment from 'moment-timezone';

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
      let { from, to } = getDashboardDto;
      from ?? (from = moment.tz('Asia/Ho_Chi_Minh').startOf('day').toDate())
      to ?? (to = moment.tz('Asia/Ho_Chi_Minh').endOf('day').toDate())

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
        managers: 0,
        'devices.status': 0,
        'devices.model': 0,
        'devices.parameterStandardDefault': 0,
        'devices.parameterStandards': 0
      });

      // II.3 Get thing warning
      const getThingWarningPromise = this.getThingWarning(
        thingId,
        getDashboardDto,
      );

      // II.4 Get thing quality report
      const geQualityReport = this.getQualityReport(thingId, getDashboardDto);

      const [timeseriesData, thingDetail, thingWarning, qualityReport] =
        await Promise.all([
          getTimeseriesDataPromise,
          getThingDetailPromise,
          getThingWarningPromise,
          geQualityReport,
        ]);

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
      let { from, to, type, timezone } = getDashboardDto;
      from ?? (from = moment.tz('Asia/Ho_Chi_Minh').startOf('day').toDate())
      to ?? (to = moment.tz('Asia/Ho_Chi_Minh').endOf('day').toDate())

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
            co2: { $avg: '$co2' },
            humidity: { $avg: '$humidity' },
            lpg: { $avg: '$lpg' },
            temperature: { $avg: '$temperature' },
            tvoc: { $avg: '$tvoc' },
            pm25: { $avg: { $getField: 'pm2.5' } },
            pm10: { $avg: '$pm10' },
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

  public async getDailyTimeseriesData(
    thingId: ObjectId,
    timezone: string = 'Asia/Saigon',
  ) {
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);

      // generate query parameters
      const match = {};
      match['metadata.thingId'] = thingId.toString();
      const startDate = moment.tz(timezone).startOf('day').toDate();
      const endDate = moment.tz(timezone).endOf('day').toDate();
      match['timestamp'] = {
        $gte: startDate,
        $lte: endDate,
      };

      const groupPipeline = [
        {
          $group: {
            _id: {
              thingId: '$metadata.thingId',
            },
            co: { $avg: '$co' },
            co2: { $avg: '$co2' },
            humidity: { $avg: '$humidity' },
            lpg: { $avg: '$lpg' },
            temperature: { $avg: '$temperature' },
            tvoc: { $avg: '$tvoc' },
            pm25: { $avg: { $getField: 'pm2.5' } },
            pm10: { $avg: '$pm10' },
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
  ) {
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      let { from, to } = getDashboardDto;
      from ?? (from = moment.tz('Asia/Ho_Chi_Minh').startOf('day').toDate())
      to ?? (to = moment.tz('Asia/Ho_Chi_Minh').endOf('day').toDate())

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
            co2: { $avg: '$co2' },
            humidity: { $avg: '$humidity' },
            lpg: { $avg: '$lpg' },
            temperature: { $avg: '$temperature' },
            tvoc: { $avg: '$tvoc' },
            pm25: { $avg: { $getField: 'pm2.5' } },
            pm10: { $avg: '$pm10' },
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

      const iaqResult = await this.calculateReport(timeseriesData[0], thingId);

      return {
        iaqResult,
        timeseriesData,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async getThingWarning(
    thingId: ObjectId,
    getDashboardDto: GetDashboardDto,
  ) {
    try {
      let { from, to, timezone } = getDashboardDto;
      from ?? (from = moment.tz('Asia/Ho_Chi_Minh').startOf('day').toDate())
      to ?? (to = moment.tz('Asia/Ho_Chi_Minh').endOf('day').toDate())

      const warnings = await this.notificationService.getThingWarnings(
        thingId,
        timezone,
        from,
        to,
      );
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
    thingId: ObjectId,
  ) {
    const thingData: ThingData = {
      ...timeseriesData,
      metadata: {
        thingId: thingId.toString(),
      },
    };
    const evaluatedParameters =
      await this.notificationService.classifyTypeAndTitle(thingId, thingData);

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
      generalIaqi,
    };

    return {
      generalIaqiReport,
      acceptableSubstances,
      unAcceptableSubstances,
    };
  }
}
