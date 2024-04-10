import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Collection, Document, MongoClient, ObjectId } from 'mongodb';
import { InjectClient, InjectCollection } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ConfigService } from '@nestjs/config';
import { UserModel } from 'src/shared/models/user.model';

@Injectable()
export class DashboardService {
  private readonly logger: Logger = new Logger(DashboardService.name);
  constructor(
    @InjectCollection(NormalCollection.THING)
    private readonly thingCollection: Collection,
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
    private readonly cfg: ConfigService,
  ) {}

  // TODO:
  public async getDashboard(thingId: ObjectId, user: UserModel) {}

  public async getTimeseriesData(thingId: ObjectId, user: UserModel) {}

  public async getQualityReport(thingId: ObjectId, user: UserModel) {}

  public async getThingWarning(thingId: ObjectId, user: UserModel) {}

  public async getThingDetail(thingId: ObjectId, user: UserModel) {}
}
