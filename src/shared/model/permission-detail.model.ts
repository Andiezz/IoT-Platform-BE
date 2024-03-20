import { BaseModel } from './base.model';

export class PermissionDetailModel extends BaseModel {
  public action: string;
  public controller: string;
  public name: string;
}