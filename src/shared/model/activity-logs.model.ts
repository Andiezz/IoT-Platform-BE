import { BaseModel } from './base.model';
import { ActivityLogType } from '../constants/activity-log.constants';
import { ActionBy, RelatedObject, TargetObject } from 'src/modules/activity-log/interfaces';

export class ActivityLogModel extends BaseModel {
  public action_by: ActionBy;
  public action_type: ActivityLogType;
  public target_object: TargetObject;
  public related_object: RelatedObject;
}