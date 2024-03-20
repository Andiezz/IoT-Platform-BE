import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum STATUS_TENANT {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_SETUP = 'pending-setup',
  IDLE = 'idle',
}

export enum TenantType {
  TENANT = 'tenant',
}

export class TenantModel extends BaseModel {
  name: string;
  information: string;
  status: STATUS_TENANT;
  is_deleted: boolean;
  created_by: ObjectId;
  updated_by: ObjectId;
}
