import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectClient, InjectCollection } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ClientSession, Collection, MongoClient, ObjectId } from 'mongodb';
import { UserModel } from 'src/shared/models/user.model';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../aws';
import { CreateThingDto } from 'src/shared/dto/request/thing/create.request';
import {
  CertificateFile,
  CreateThingResponse,
} from 'src/shared/dto/response/thing/create.response';
import {
  Certificate,
  DEVICE_STATUS,
  Device,
  Location,
  Manager,
  ParameterStandard,
  ThingModel,
} from 'src/shared/models/thing.model';

@Injectable()
export class ThingService {
  private readonly logger: Logger = new Logger(ThingService.name);
  constructor(
    @InjectCollection(NormalCollection.THING)
    private readonly thingCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
    private readonly cfg: ConfigService,
    private readonly awsService: AwsService,
  ) {}

  public async create(
    { name, information, location, managers, devices }: CreateThingDto,
    user: UserModel,
  ): Promise<CreateThingResponse> {
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      // I. Validate data
      await this.isNameExist(name, session);

      // II. Create Thing
      const thingModel = new ThingModel();
      thingModel._id = new ObjectId();
      thingModel.name = name;
      thingModel.information = information;
      thingModel.status = DEVICE_STATUS.PENDING_SETUP;
      thingModel.location = new Location();
      thingModel.location.name = location.name;
      thingModel.location.address = location.address;
      thingModel.location.longitude = location.longitude;
      thingModel.location.latitude = location.latitude;
      thingModel.isDeleted = false;
      thingModel.createdBy = user._id;
      thingModel.updatedBy = user._id;

      // II.1 Create devices
      const associatedDevices: Device[] = [];
      devices.map((device) => {
        const deviceModel = new Device();
        deviceModel.name = device.name;
        deviceModel.information = device.information;
        deviceModel.status = DEVICE_STATUS.PENDING_SETUP;
        deviceModel.type = device?.type;
        deviceModel.model = device.model;

        const deviceParameterStandards: ParameterStandard[] = [];
        device.parameterStandards.map((parameterStandard) => {
          const parameterStandardModel = new ParameterStandard();
          parameterStandardModel.name = parameterStandard.name;
          parameterStandardModel.unit = parameterStandard.unit;
          parameterStandardModel.min = parameterStandard?.min;
          parameterStandardModel.max = parameterStandard?.max;
          deviceParameterStandards.push(parameterStandardModel);
        });

        associatedDevices.push(deviceModel);
      });
      thingModel.devices = associatedDevices;

      // II.2 Create managers
      const thingManagers: Manager[] = [];
      managers.map((manager) => {
        const managerModel = new Manager();
        managerModel.userId = manager.userId;
        managerModel.isOwner = manager.isOwner;
        thingManagers.push(managerModel);
      });
      thingModel.managers = thingManagers;

      // II.3 Create AWS Thing
      const thing = await this.awsService.createThingWithCert({
        name: thingModel._id.toString(),
        isActive: true,
      });
      const certificate = new Certificate();
      certificate.certArn = thing.certArn;
      certificate.certId = thing.certId;

      const streamFiles: Array<CertificateFile> = [
        {
          file: Buffer.from(thing.awsRootCaPem, 'utf-8'),
          name: `${thingModel._id.toString()}-root.pem`,
          type: 'root-ca',
        },
        {
          file: Buffer.from(thing.thingCertPem, 'utf-8'),
          name: `${thingModel._id.toString()}-certificate.pem.crt`,
          type: 'thing-certificatie',
        },
        {
          file: Buffer.from(thing.keyPair.privateKey, 'utf-8'),
          name: `${thingModel._id.toString()}-private.pem.key`,
          type: 'private-key',
        },
        {
          file: Buffer.from(thing.keyPair.publicKey, 'utf-8'),
          name: `${thingModel._id.toString()}-public.pem.key`,
          type: 'public-key',
        },
      ];

      await db
        .collection(NormalCollection.THING)
        .insertOne(thingModel, { session });

      // III. Create collection timeseries
      await db.createCollection(
        `${thingModel._id.toString()}_timeseries_data`,
        {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'seconds',
          },
        },
      );
      // indexes
      await db
        .collection(`${thingModel._id.toString()}_timeseries_data`)
        .createIndex({
          'metadata.thingId': 1,
          timestamp: -1,
        });

      await session.commitTransaction();
      // response
      const response = new CreateThingResponse();
      response.files = streamFiles;
      response.msg = 'thing-created-success';
      response.id = thingModel._id.toString();
      return response;
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  public async isNameExist(
    name: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const nameIsExist = await this.thingCollection.findOne(
      {
        name,
        isDeleted: false,
      },
      { session },
    );
    if (nameIsExist) throw new BadRequestException('thing-name-existed');

    return false;
  }
}
