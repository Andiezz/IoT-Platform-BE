import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';
import { SETTING_STATUS, SETTING_TYPE } from 'src/modules/setting/setting.interface';

export class SettingModel extends BaseModel {
    public status?: SETTING_STATUS;
    public point?: number;
    public min_soc?: number;
    public max_soc?: number;
    public plant_id: ObjectId;
    public device_id: ObjectId;
    public type: SETTING_TYPE;
}