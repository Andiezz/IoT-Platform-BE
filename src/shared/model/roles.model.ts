import { BaseModel } from './base.model';

export class RoleModel extends BaseModel {
  public name: string;
  public role: string;
  public is_active: string;
}