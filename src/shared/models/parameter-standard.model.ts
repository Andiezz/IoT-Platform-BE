import { ObjectId } from "mongodb";
import { BaseModel } from "./base.model";

export class ParameterStandardModel extends BaseModel {
  public name: string;
  public parameterId: ObjectId;
  public deviceId: ObjectId;
  public min: number;
  public max: number;
}
