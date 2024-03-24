import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum DEVICE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_SETUP = 'pending-setup',
}

export class DeviceModel extends BaseModel {
  public name: string;
  public information: string;
  public status: DEVICE_STATUS;
  public thingId: ObjectId;
}
