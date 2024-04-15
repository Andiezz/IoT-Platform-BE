import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export class DeviceModel extends BaseModel {
  public name: string;
  public information: string;
  public type: string;
  public parameterStandards: ObjectId[];
}
