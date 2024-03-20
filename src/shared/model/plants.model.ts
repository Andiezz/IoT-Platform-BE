import { ObjectId } from "mongodb";
import { BaseModel } from "./base.model";

export enum STATUS_PLANT {
    INACTIVE = "inactive",
    ACTIVE = "active",
    PENDING_SETUP = "pending-setup",
    IDLE = "idle",
    ALL = "all"
}

export class DeviceModel {
    public company: string;
    public device_type_id: ObjectId;
    public capacity: number;
}

export class PlantModel extends BaseModel {
    public name: string;
    public tenant_id?: ObjectId;
    public location_name: string;
    public latitude: number;
    public longitude: number;
    public address: string;
    public weather_key: string;
    public status: STATUS_PLANT;
    public is_deleted: boolean;
    public devices: DeviceModel[];
    public created_by: ObjectId;
    public updated_by: ObjectId;
}