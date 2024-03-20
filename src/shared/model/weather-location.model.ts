import { BaseModel } from './base.model';
import { ObjectId } from 'mongodb';

export class WeatherModel extends BaseModel {
    public info: string;
    public location_id: ObjectId;
    public weather_key: string;
}