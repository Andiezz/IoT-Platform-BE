import { BaseModel } from './base.model';

export class Threshold {
  public name: string;
  public color: string;
  public min: number;
  public max: number;
}

export class ParameterStandardModel extends BaseModel {
  public name: string;
  public unit: string;
  public weight: number;
  public thresholds: Threshold[];
}
