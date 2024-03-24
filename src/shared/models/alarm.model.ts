import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum ALARM_STATUS {
  NEW = 'new',
  ACKNOWLEDGE = 'acknowledged',
  RESOLVED = 'resolved',
  IGNORED = 'ignored',
}

export type AlarmMetadata = {
  thingId: ObjectId;
  alarmId: ObjectId;
};

export class AlarmModel extends BaseModel {
  timestamp: Date;
  public code: number;
  public message: number;
  public status: ALARM_STATUS;
  public metadata: AlarmMetadata;
}
