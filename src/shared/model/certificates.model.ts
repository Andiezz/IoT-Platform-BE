import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export class CertificatesModel extends BaseModel {
    public cert_id: string;
    public thing_id: string;
    public cert_am: string;
    public device_id: ObjectId;
}