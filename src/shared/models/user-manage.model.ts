import { BaseModel } from "./base.model";
import { ObjectId } from 'mongodb';

export class UserManageModel extends BaseModel {
  public userId: ObjectId;
  public deviceId: ObjectId;
  public isOwner: boolean;
}
