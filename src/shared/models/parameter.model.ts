import { ObjectId } from "mongodb";
import { BaseModel } from "./base.model";

export class ParameterModel extends BaseModel {
  public typeId: ObjectId;
  public name: string;
  public unit: string;
}
