import { BaseModel } from './base.model';
import { ObjectId } from 'mongodb';

export class GroupPermissionDetailModel extends BaseModel {
    public group_id: ObjectId;
    public permission_detail_id: ObjectId;
}