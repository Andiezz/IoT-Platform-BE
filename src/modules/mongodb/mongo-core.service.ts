import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  MigrationItem,
  MigrationOptions,
  MigrationStructure,
  MongoModuleOptions,
  SeedDataItem,
  SeedDataStructure,
} from './interfaces';
import { FILE_DATE_NAME_FORMAT, MONGO_MODULE_OPTIONS } from './mongo.constants';
import { ClientSession, Db, MongoClient, ObjectId } from 'mongodb';
import { InjectClient } from './mongo.decorators';
import { join } from 'path';
import { readdirSync } from 'fs';
import * as dayjs from 'dayjs';
const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

@Injectable()
export class MongoCoreService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MongoCoreService.name);
  constructor(
    @Inject(MONGO_MODULE_OPTIONS)
    private readonly mongoOptions: MongoModuleOptions,
    @InjectClient()
    private readonly client: MongoClient,
  ) { }

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(`Start migration at ${new Date().toISOString()}`);

    const migration = this.mongoOptions.migration;

    if (!migration || !migration.enabled) {
      return;
    }

    const session = this.client.startSession();
    try {
      const db = this.client.db(this.mongoOptions.dbName);
      session.startTransaction();
      await this.seed(migration, session, db);
      await this.migration(migration, session, db);
      session.inTransaction() && (await session.commitTransaction());
    } catch (error) {
      this.logger.error('Got error when run migration data');
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      // process.exit(100);
    } finally {
      await session.endSession();
    }
    this.logger.log(`Finish migration at ${new Date().toISOString()}`);
  }

  private async migration(migration: MigrationOptions, session: ClientSession, db: Db): Promise<void> {
    const trackerCollection = db.collection(migration.collectionName);
    let tracker = await trackerCollection.findOne(
      {
        type: 'migration',
      },
      {
        sort: {
          ranOn: -1,
        },
      },
    );

    const root = require.main.path;
    const migrationPath = join(root, migration.dir);
    const files = readdirSync(migrationPath);
    const validMigrationFile: Array<{
      date: Date;
      name: string;
    }> = [];

    if (files && files.length) {
      for (const f of files) {
        if (f.startsWith('v')) {
          const datePart = f.split('_')[1];
          const dateInFile = dayjs(datePart, FILE_DATE_NAME_FORMAT, true);

          if (dateInFile.isValid() && (!tracker || dateInFile.isAfter(tracker.ranOn))) {
            validMigrationFile.push({
              date: dateInFile.toDate(),
              name: f,
            });
          } else {
            this.logger.warn('Got it valid file name:::', f);
          }
        }
      }
    }

    if (validMigrationFile.length) {
      for (const f of validMigrationFile) {
        const data: MigrationStructure = require(join(migrationPath, f.name));
        const createCollection: MigrationItem[] = [];
        const dropCollection: MigrationItem[] = [];
        const createIndex: MigrationItem[] = [];
        const dropIndex: MigrationItem[] = [];
        if (data.list && data.list.length) {
          data.list.forEach((e) => {
            if (e.type == 'index') {
              if (e.action === 'drop') {
                dropIndex.push(e);
              } else {
                createIndex.push(e);
              }
            } else if (e.type == 'collection') {
              if (e.action == 'create') {
                createCollection.push(e);
              } else {
                dropCollection.push(e);
              }
            }
          });
        }

        if (createCollection.length) {
          for (const c of createCollection) {
            await db.createCollection(c.collection, {
              ...c.options,
              session,
            });
          }
        }
        if (createIndex.length) {
          for (const c of createIndex) {
            await db.createIndex(c.collection, c.indexSpec, {
              ...c.options,
              session,
            });
          }
        }

        if (dropCollection.length || createCollection.length || createIndex.length || dropIndex.length) {
          const tracker = {
            ranOn: new Date(),
            file: f.name,
            _id: new ObjectId(),
            type: 'migration',
          };
          await trackerCollection.insertOne(tracker, {
            session,
          });
        }
      }
    }
  }

  private async seed(migration: MigrationOptions, session: ClientSession, db: Db): Promise<void> {
    const trackerCollection = db.collection(migration.collectionName);
    let tracker = await trackerCollection.findOne(
      {
        type: 'seed',
      },
      {
        sort: {
          ranOn: -1,
        },
      },
    );

    const root = require.main.path;
    const seedPath = join(root, migration.seed);
    const files = readdirSync(seedPath);
    const seedFiles: Array<{
      date: Date;
      name: string;
    }> = [];

    if (files && files.length) {
      for (const f of files) {
        if (f.startsWith('v')) {
          const datePart = f.split('_')[1];
          const dateInFile = dayjs(datePart, FILE_DATE_NAME_FORMAT, true);

          if (dateInFile.isValid() && (!tracker || dateInFile.isAfter(tracker.ranOn))) {
            seedFiles.push({
              date: dateInFile.toDate(),
              name: f,
            });
          } else {
            this.logger.warn('Got it valid file name:::', f);
          }
        }
      }
    }

    if (seedFiles.length) {
      for (const f of seedFiles) {
        const data: SeedDataStructure = require(join(seedPath, f.name));
        const addNewData: SeedDataItem[] = [];
        const updateData: SeedDataItem[] = [];
        const removeData: SeedDataItem[] = [];

        if (data.list && data.list.length) {
          data.list.forEach((e) => {
            if (e.action == 'insert') {
              addNewData.push(e);
            } else if (e.action == 'update') {
              updateData.push(e);
            } else {
              removeData.push(e);
            }
          });
        }

        if (addNewData.length) {
          for (const c of addNewData) {
            const data = c.options;
            if (data && data.length) {
              const collection = db.collection(c.collection);
              for (const d of data) {
                let id = d['_id'];
                if (!id || !ObjectId.isValid(id)) {
                  id = new ObjectId();
                }
                await collection.insertOne(
                  {
                    _id: id,
                    ...d.data,
                  },
                  {
                    ...d.option,
                    session,
                  },
                );
              }
            }
          }
        }

        if (updateData.length) {
          for (const c of updateData) {
            const data = c.options;
            if (data && data.length) {
              const collection = db.collection(c.collection);
              for (const d of data) {
                if (d.filter) {
                  await collection.updateOne(
                    {
                      ...d.filter,
                    },
                    {
                      ...d.data,
                    },
                    {
                      ...d.option,
                      session,
                    },
                  );
                }
              }
            }
          }
        }

        if (removeData.length) {
          for (const c of removeData) {
            const data = c.options;
            if (data && data.length) {
              const collection = db.collection(c.collection);
              for (const d of data) {
                if (d.filter) {
                  await collection.deleteOne(
                    {
                      ...d.filter,
                    },
                    {
                      ...d.option,
                      session,
                    },
                  );
                }
              }
            }
          }
        }

        if (addNewData.length || updateData.length || removeData.length) {
          const tracker = {
            ranOn: new Date(),
            file: f.name,
            _id: new ObjectId(),
            type: 'seed',
          };
          await trackerCollection.insertOne(tracker, {
            session,
          });
        }
      }
    }
  }
}
