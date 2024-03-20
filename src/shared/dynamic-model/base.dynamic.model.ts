import {
  Collection,
  Db,
  ObjectId,
  Document,
  Filter,
  AggregationCursor,
  UpdateOptions,
  UpdateFilter,
  FindOptions,
  AggregateOptions,
  CountDocumentsOptions,
  DeleteOptions,
  InsertOneOptions,
  BulkWriteOptions,
} from 'mongodb';
import { BaseModel } from '../model/base.model';

export class BaseDynamic<T extends BaseModel> {
  protected collectionPostfix: string;
  protected db: Db;
  constructor(postfix: string, db: Db) {
    if (!postfix || !db) {
      throw new Error('Invalid Argument');
    }
    this.collectionPostfix = postfix;
    this.db = db;
  }

  protected getCollection(name: string): Collection<Document> {
    const collection = this.db.collection(`${name}${this.collectionPostfix}`);
    return collection;
  }

  public async insertOne(collectionName: string, model: T, options?: InsertOneOptions): Promise<T> {
    const collection = this.getCollection(collectionName);
    if (!model['_id']) {
      const id = new ObjectId();
      model['_id'] = id;
    }
    const result = await collection.insertOne(model, {
      ...(options || {}),
    });
    if (!result.acknowledged || !result.insertedId) {
      throw new Error('Insert failed!');
    }

    return {
      ...model,
    };
  }

  public async insertMany(collectionName: string, models: T[], options?: BulkWriteOptions): Promise<T[]> {
    const collection = this.getCollection(collectionName);
    const results = await collection.insertMany(models, {
      ...(options || {}),
    });
    if (!results.acknowledged || results.insertedCount < 1) {
      throw new Error('Insert many failed');
    }
    return models;
  }

  public async findOne(collectionName: string, id: string | ObjectId, options?: FindOptions): Promise<T> {
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid object id');
    }

    const collection = this.getCollection(collectionName);
    const result = await collection.findOne(
      {
        _id: new ObjectId(id),
      },
      {
        ...(options || {}),
      },
    );
    return result as T;
  }

  public async find(collectionName: string, filter: Filter<T> = {}, options: FindOptions<T> = {}): Promise<T[]> {
    const collection = this.getCollection(collectionName);
    const results = await collection.find(filter, options).toArray();

    return results as T[];
  }

  public async findAndCount(
    collectionName: string,
    countOptions: CountDocumentsOptions,
    filter: Filter<T> = {},
    options: FindOptions<T> = {},
  ): Promise<{
    results: T[];
    count: number;
  }> {
    const collection = this.getCollection(collectionName);
    const count = await collection.countDocuments(filter, countOptions);
    const results = await collection.find(filter, options).toArray();

    return {
      results: results as T[],
      count,
    };
  }

  public async updateOne(
    collectionName: string,
    model: UpdateFilter<Partial<T>>,
    option: UpdateOptions,
    filter: Filter<T> = {},
  ): Promise<boolean> {
    const collection = this.getCollection(collectionName);
    const result = await collection.updateOne(filter, model, option);
    return result.modifiedCount > 0;
  }

  public async updateMany(
    collectionName: string,
    model: UpdateFilter<Partial<T>>,
    option: UpdateOptions,
    filter: Filter<T> = {},
  ): Promise<boolean> {
    const collection = this.getCollection(collectionName);
    const result = await collection.updateMany(filter, model, option);
    return result.modifiedCount > 0;
  }

  public async deleteOneById(collectionName: string, id: string | ObjectId): Promise<boolean> {
    if (!ObjectId.isValid(id)) {
      throw new Error('Invalid object id');
    }
    const collection = this.getCollection(collectionName);
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.acknowledged && result.deletedCount > 0;
  }

  public async deleteOne(
    collectionName: string,
    filter: Filter<Partial<T>>,
    opt: DeleteOptions = {},
  ): Promise<boolean> {
    const collection = this.getCollection(collectionName);
    const result = await collection.deleteOne(filter, opt);
    return result.acknowledged && result.deletedCount > 0;
  }

  public async deleteMany(
    collectionName: string,
    filter: Filter<Partial<T>>,
    opt: DeleteOptions = {},
  ): Promise<boolean> {
    const collection = this.getCollection(collectionName);
    const result = await collection.deleteMany(filter, opt);
    return result.acknowledged && result.deletedCount > 0;
  }

  public async aggregate(
    collectionName: string,
    pipeline: Document[],
    opt: AggregateOptions = {},
  ): Promise<AggregationCursor<Document>> {
    return this.getCollection(collectionName).aggregate(pipeline, opt);
  }

  public async count(collectionName: string, filter: Filter<T>, countOpt: CountDocumentsOptions = {}) {
    return await this.getCollection(collectionName).countDocuments(filter, countOpt);
  }
}
