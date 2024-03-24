import {
  CreateIndexesOptions,
  DropIndexesOptions,
  IndexSpecification,
  Filter,
  DeleteOptions,
  UpdateOptions,
  BulkWriteOptions,
  CreateCollectionOptions,
} from 'mongodb';

export type MigrationType = 'index' | 'collection';

export type MigrationActionType = 'create' | 'drop';

export interface MigrationItem {
  collection: string;
  type: MigrationType;
  name?: string;
  action: MigrationActionType;
  indexSpec: IndexSpecification;
  options: CreateIndexesOptions | DropIndexesOptions | CreateCollectionOptions;
}

export interface MigrationStructure {
  list: MigrationItem[];
}

export type SeedDataAction = 'update' | 'insert' | 'delete';

export interface SeedData {
  filter: Filter<unknown>;
  option: DeleteOptions | BulkWriteOptions | UpdateOptions;
  data: Record<string, string>;
}

export interface SeedDataItem {
  collection: string;
  action: SeedDataAction;
  options: SeedData[];
}

export interface SeedDataStructure {
  list: SeedDataItem[];
}
