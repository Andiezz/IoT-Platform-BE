import { ObjectId } from 'mongodb';
import { BaseModel } from './base.model';
import { ParameterStandardModel } from './parameter-standard.model';

export enum DEVICE_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_SETUP = 'pending-setup',
}

export class Device {
  public name: string;
  public status: DEVICE_STATUS;
  public model: ObjectId;
  public parameterStandards: ParameterStandardModel[];
  public parameterStandardDefault: boolean;
}

export class Location {
  public name: string;
  public address: string;
  public longitude: number;
  public latitude: number;
}

export class Certificate {
  public certId: string;
  public certArn: string;
}

export class Manager {
  public userId: ObjectId;
  public isOwner: boolean;
}

export class ThingModel extends BaseModel {
  public name: string;
  public information: string;
  public location: Location;
  public status: DEVICE_STATUS;
  public managers: Manager[];
  public certificate: Certificate;
  public devices: Device[];
}
