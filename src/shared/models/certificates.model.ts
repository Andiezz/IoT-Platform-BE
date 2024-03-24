import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';

export class CertificatesModel extends BaseModel {
  public certId: string;
  public thingId: ObjectId;
  public certAm: string;
  public deviceId: ObjectId;
}
