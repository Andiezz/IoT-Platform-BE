import { ObjectId } from 'mongodb';
import { BaseModel } from '../base.model';
import { TenantTimeseriesMetadata } from 'src/shared/constants/alarm.constants';

export enum SYSTEM_STATE {
  'System Initializing',
  'Standby',
  'Grid Connected - Idle',
  'Grid Connected - Discharging',
  'Grid Connected - Charging',
  'Off-Grid',
  'Fault',
}

export enum ALARM_TYPE {
  SYSTEM_ALARM = 'system-alarm',
  BATTERY_ALARM = 'battery-alarm',
  // WARNING = 'warning',
  FAULT = 'fault',
  CELL_WARNINGS = 'cell-warning',
  CELL_ALARMS = 'cell-alarm',
  SYSTEM_STATE = 'system-state',

}

export enum ALARM_STATUS {
  NEW = 'new',
  ACKNOWLEDGE = 'acknowledged',
  RESOLVED = 'resolved',
}

export class AlarmDescription {
  public alarm_type: ALARM_TYPE;
  public message: string[];
}

export class AlarmDynamicModel extends BaseModel {
  public device_id: ObjectId;
  public tenant_id: ObjectId;
  public plant_id: ObjectId;
  public location_id: ObjectId;
  public system_state: string;
  public description: AlarmDescription[]; //
  public alarm_type: ALARM_TYPE[];
  public notes: string;
  public status: ALARM_STATUS;
  public timestamp: Date;
  public timeseries_id: ObjectId;
  public phase: number;
  public systemState: number;
  public faultType: number;
  public phaseVac: number;
  public phaseFrequency: number;
  public '3PhaseSOC': number;
  public batteryAlarms: string;
  public systemAlarms: string;
  public cellWarnings: string;
  public cellAlarms: string;
  public metadata: TenantTimeseriesMetadata;
}