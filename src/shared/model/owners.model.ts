import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum USER_MANAGE_POSITION {
    OWNER = 'owner',
    VIEWER = 'viewer'
}

export class OwnerModel extends BaseModel {
    public user_id: ObjectId;
    public plant_id: ObjectId;
    public created_by: ObjectId;
    public position: USER_MANAGE_POSITION;
}
