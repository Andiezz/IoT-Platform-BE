import { ObjectId } from "mongodb";
import { BaseModel } from "./base.model";

export class NotificationModel extends BaseModel {
    title: string;
    description: object;
    type: string;
    info: object;
    action_by_id: ObjectId;
  }