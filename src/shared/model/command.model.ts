import { ObjectId } from "mongodb";
import { BaseModel } from "./base.model";
import { COMMAND, LEVEL, STATUS_COMMAND } from "../constants/command.constant"

export class Command extends BaseModel {
  job_id?: string;
  tunnel_id?: string;
  user_id: ObjectId;
  plant_id: ObjectId;
  device_id?: ObjectId;
  command_name: COMMAND;
  level: LEVEL;
  status: STATUS_COMMAND;
  service_name?: string;
}