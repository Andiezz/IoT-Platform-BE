import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export class ReadNotificationModel extends BaseModel {
  user_id: ObjectId;
  notification_id: ObjectId;
  user_notification_id: ObjectId;
}
