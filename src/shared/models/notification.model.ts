import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum TargetModel {
  DEVICE = 'device',
  USER = 'user',
}

export class Receiver {
  userId: ObjectId;
  readAt: Date | null;
}

export class NotificationModel extends BaseModel {
  title: string;
  content: string;
  type: string;
  receivers: Receiver[];
}
