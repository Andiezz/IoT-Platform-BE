import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';


export class DictionaryModel extends BaseModel {
    public name: string;
    public settings: string;
    public service: string;
    public plant_id: ObjectId;
}