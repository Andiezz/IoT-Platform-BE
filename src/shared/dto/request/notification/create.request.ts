import { TYPE } from 'src/modules/notification/template-notification';

export class EvaluatedParameter {
  name: string;
  value: string;
  unit: string;
  threshold: {
    name: string;
    min: string;
    max: string;
  };
  type?: string;
}

export class CreateExceedThresholdNotificationDto {
  deviceName: string;
  type: string = TYPE.WARNING;
  parameters: EvaluatedParameter[];
}
