import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export class UserLoginModel extends BaseModel{
  public userId: ObjectId;
  public token: string;
  public ttl: Date;

}