import { Injectable, Logger } from '@nestjs/common';
import { InjectClient } from '../mongodb';
import { Collection, MongoClient } from 'mongodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ValidationService {
  private readonly logger: Logger = new Logger(ValidationService.name);

  constructor(
    @InjectClient()
    private readonly client: MongoClient,
    private readonly cfg: ConfigService
  ) { }

  collection(model: string): Collection {
    const db = this.client.db(this.cfg.getOrThrow('database').dbName);
    return db.collection(model);
  }
}
