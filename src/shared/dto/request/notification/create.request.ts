class Parameter {
  name: string;
  value: string;
  unit: string;
  message: string;
  type: string;
}

export class CreateExceedThresholdNotificationDto {
  deviceName: string;
  parameters: Parameter[];
}
