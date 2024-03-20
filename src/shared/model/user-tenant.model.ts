import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export enum TargetModelConstant {
  TENANT = "TENANT",
  LOCATION = "LOCATION"
}
export class UserManangeModel extends BaseModel{
  public type: string;
  public targetId: ObjectId;
  public targetModel: TargetModelConstant;
  public userId: ObjectId;
}