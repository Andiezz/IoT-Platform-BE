import { ObjectId } from 'mongodb';

export class BaseModel {
  public _id: ObjectId;
  public createdOn: Date = new Date();
  public updatedOn: Date = new Date();
  [key: string]: unknown
}