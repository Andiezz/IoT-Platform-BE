import { BaseModel } from './base.model';
import { ObjectId } from 'mongodb';



export class DeviceModel extends BaseModel {
    public email: string;
    public name: string;
    public tenant_id: ObjectId;
    public location_id: ObjectId;
    public plant_id: ObjectId;
    public type: string;
    public status: string;
    public device_type_id: ObjectId;
    public path: string;
    public information: string | number;
    public is_deleted: boolean = false;
    public id_map: string;
    public note: string;
    public created_by: ObjectId;
    public updated_by: ObjectId;
}