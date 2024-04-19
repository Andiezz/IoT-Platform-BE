import { IParameterThreshold, ParameterThreshold } from 'src/modules/thing/thing.constant';
import { CHART_TYPE } from 'src/shared/constants/dashboard.constants';
import { NotificationModel } from 'src/shared/models/notification.model';
import { ThingModel } from 'src/shared/models/thing.model';
import { EvaluatedParameter } from '../../request/notification/create.request';
import { ApiProperty } from '@nestjs/swagger';
import { ThingResponse } from '../thing/detail.response';

export class TimeseriesData {
  @ApiProperty()
  co: number;

  @ApiProperty()
  toluen: number;

  @ApiProperty()
  alcohol: number;

  @ApiProperty()
  ch4: number;

  @ApiProperty()
  aceton: number;

  @ApiProperty()
  'pm2.5': number;

  @ApiProperty()
  pm10: number;

  @ApiProperty()
  co2: number;

  @ApiProperty()
  humidity: number;

  @ApiProperty()
  lpg: number;

  @ApiProperty()
  temperature: number;
  
  @ApiProperty()
  nh4: number;

  @ApiProperty()
  count: number;

  @ApiProperty()
  tvoc: number;

  @ApiProperty()
  time: string;

  @ApiProperty()
  chartType: CHART_TYPE;
}

export class IAQResult {
  @ApiProperty({ type: ParameterThreshold })
  generalIaqiReport: IParameterThreshold;

  @ApiProperty({ type: [EvaluatedParameter] })
  acceptableSubstances: EvaluatedParameter[];

  @ApiProperty({ type: [EvaluatedParameter] })
  unAcceptableSubstances: EvaluatedParameter[];
}


export class QualityReportDto {
  @ApiProperty({ type: IAQResult })
  iaqResult: IAQResult;

  @ApiProperty({ type: [TimeseriesData] })
  timeseriesData: TimeseriesData[];
}

export class GetDashboardResponse {
  @ApiProperty({ type: [TimeseriesData] })
  timeseriesData: TimeseriesData[];

  @ApiProperty({ type:NotificationModel})
  thingWarning: NotificationModel;

  @ApiProperty({ type:ThingResponse})
  thingDetail: ThingResponse;

  @ApiProperty({ type: QualityReportDto })
  qualityReport: QualityReportDto;
}
