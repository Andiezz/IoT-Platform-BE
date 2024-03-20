import { BaseModel } from './base.model';

export class RolePermissionModel extends BaseModel {
  public role_key: string;
  public permissionId: string;
}