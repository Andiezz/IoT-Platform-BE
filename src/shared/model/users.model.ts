import { BaseModel } from './base.model';
import { TenantModel } from './tenants.model';
import { RoleModel } from './roles.model';
import { ObjectId } from 'mongodb';

export type UserRole = Pick<RoleModel, '_id' | 'name' | 'role'>

export class UserModel extends BaseModel {
  public email: string;
  public first_name: string;
  public last_name: string;
  public activation_code: string;
  public phone_code: string;
  public phone_number: string;
  public avatar: string;
  public salt: string;
  public hash: string;
  public is_active: boolean;
  public is_first_login = true;
  public role?: UserRole;
  public created_by: ObjectId
}