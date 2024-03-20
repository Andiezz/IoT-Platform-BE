import { BaseModel } from './base.model';
import { ObjectId } from 'mongodb';

export class UserActivityLogModel extends BaseModel {
    public user_id: ObjectId;
    public activity_log_id: ObjectId;
}