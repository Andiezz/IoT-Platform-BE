import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum TargetModel {
  DEVICE = 'device',
  USER = 'user',
}

export class NotificationModel extends BaseModel {
  title: string;
  content: string;
  type: string;
  target: ObjectId;
  targetModel: TargetModel;
}
