import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export class UserNotificationModel extends BaseModel {
  all: boolean;
  user_id: ObjectId;
  notification_id: ObjectId;
  read_at: boolean;
}
