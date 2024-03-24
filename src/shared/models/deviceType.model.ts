import { ObjectId } from "mongodb";
import { BaseModel } from "./base.model";

export class DeviceTypeModel extends BaseModel {
  public typeId: ObjectId;
  public deviceId: ObjectId;
}
