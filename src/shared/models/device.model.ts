export enum DEVICE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_SETUP = 'pending-setup',
}

export class ParameterStandard {
  public name: string;
  public unit: string;
  public min?: number;
  public max?: number;
}

export class Device {
  public name: string;
  public information: string;
  public status: DEVICE_STATUS;
  public type?: string;
  public model: string;
  public parameterStandards: ParameterStandard[];
}