import { PARAMETER_NAME, PARAMETER_THRESHOLD_NAME } from 'src/modules/thing/thing.constant';
import { BaseModel } from './base.model';

export class Threshold {
  public name: PARAMETER_THRESHOLD_NAME;
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
