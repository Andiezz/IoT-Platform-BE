import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';
import { RoleModel } from './roles.model';

export type Role = Pick<RoleModel, 'id' | 'role' | 'name'>

export enum USER_ROLE {
  'super-admin',
  'tenant-user',
  'tenant-admin',
  'analyst',
}

export class UserRoleModel extends BaseModel {
  public user_id: ObjectId;
  public role_id: ObjectId;
  public role?: Role
}