import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum STATUS_SERVICE {
    INACTIVE = 'inactive',
    ACTIVE = 'active'
}

export class ServicesModel extends BaseModel {
    public name: string;
    public version: string;
    public plant_id: ObjectId;
    public status: STATUS_SERVICE;
}