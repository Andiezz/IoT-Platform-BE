import { BaseModel } from './base.model';
import { DEVICE_STATUS } from './device.model';

export type Location = {
  lat: number;
  lng: number;
};

export class ThingModel extends BaseModel {
  public name: string;
  public information: string;
  public location: object;
  public address: string;
  public status: DEVICE_STATUS;
}
