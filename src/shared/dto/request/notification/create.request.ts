import { TYPE } from "src/modules/notification/template-notification";

export class Parameter {
  name: string;
  value: string;
  unit: string;
  message: string;
  type?: string;
}

export class CreateExceedThresholdNotificationDto {
  deviceName: string;
  type: string = TYPE.WARNING;
  parameters: Parameter[];
}
