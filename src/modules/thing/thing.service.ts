import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectClient, InjectCollection } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ClientSession, Collection, MongoClient, ObjectId } from 'mongodb';
import { ROLE, UserModel } from 'src/shared/models/user.model';
import { ConfigService } from '@nestjs/config';
import { AwsService } from '../aws';
import {
  DeviceDto,
  SaveThingDto,
} from 'src/shared/dto/request/thing/create.request';
import {
  CertificateFile,
  SaveThingResponse,
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
import { EXCULDE_BASE_MODEL } from 'src/shared/dto/response/constants/exclude-base-model.response';
import {
  checkDuplicateInArray,
  checkValueExistInObjectArray,
} from 'src/shared/utils/array.utils';
import { ListThingDto } from 'src/shared/dto/request/thing/list.request';
import { findRelative } from 'src/shared/utils/find-relative.utils';
import { ThingData } from '../iot-consumer/iot-consumer.interface';
import { PARAMETER_MESSAGE, PARAMETER_NAME } from './thing.constant';
import { TYPE } from '../notification/template-notification';
import { Parameter } from 'src/shared/dto/request/notification/create.request';

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
    { name, information, location, managers, devices }: SaveThingDto,
    user: UserModel,
  ): Promise<SaveThingResponse> {
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      // I. Validate data
      await this.isNameExist(name, {}, session);
      const isDeviceNameDuplicate = checkDuplicateInArray(devices, 'name');
      if (isDeviceNameDuplicate) {
        throw new BadRequestException('device-name-must-unique');
      }

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
      thingModel.devices = devices.map((device) => {
        const deviceModel = new Device();
        deviceModel.name = device.name;
        deviceModel.information = device.information;
        deviceModel.status = DEVICE_STATUS.PENDING_SETUP;
        deviceModel.type = device?.type;
        deviceModel.model = device.model;
        deviceModel.parameterStandards = device.parameterStandards.map(
          (parameterStandard) => {
            const parameterStandardModel = new ParameterStandard();
            parameterStandardModel.name = parameterStandard.name;
            parameterStandardModel.unit = parameterStandard.unit;
            parameterStandardModel.min = parameterStandard?.min;
            parameterStandardModel.max = parameterStandard?.max;
            return parameterStandardModel;
          },
        );

        return deviceModel;
      });

      // II.2 Assign managers
      thingModel.managers = managers.map((manager) => {
        const managerModel = new Manager();
        managerModel.userId = new ObjectId(manager.userId);
        managerModel.isOwner = manager.isOwner;
        return managerModel;
      });

      // II.3 Create AWS Thing
      const thing = await this.awsService.createThingWithCert({
        name: thingModel._id.toString(),
        isActive: true,
      });
      const certificate = new Certificate();
      certificate.certArn = thing.certArn;
      certificate.certId = thing.certId;
      thingModel.certificate = certificate;

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

      await this.thingCollection.insertOne(thingModel, { session });

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
      const response = new SaveThingResponse();
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

  public async update(
    thingId: ObjectId,
    { name, information, location, managers, devices }: SaveThingDto,
    user: UserModel,
  ): Promise<SaveThingResponse> {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      // I. Validate data
      const thing = await this.isExist({ _id: thingId }, session);
      if (!checkValueExistInObjectArray(thing.managers, 'userId', user._id)) {
        throw new BadRequestException('no-permission');
      }
      await this.isNameExist(name, { _id: { $ne: thingId } }, session);
      const isDeviceNameDuplicate = checkDuplicateInArray(devices, 'name');
      if (isDeviceNameDuplicate) {
        throw new BadRequestException('device-name-must-unique');
      }

      // II. Update devices
      const associatedDevices = devices.map((device) => {
        const deviceModel = new Device();
        deviceModel.name = device.name;
        deviceModel.information = device.information;
        deviceModel.status = DEVICE_STATUS.PENDING_SETUP;
        deviceModel.type = device?.type;
        deviceModel.model = device.model;
        deviceModel.parameterStandards = device.parameterStandards.map(
          (parameterStandard) => {
            const parameterStandardModel = new ParameterStandard();
            parameterStandardModel.name = parameterStandard.name;
            parameterStandardModel.unit = parameterStandard.unit;
            parameterStandardModel.min = parameterStandard?.min;
            parameterStandardModel.max = parameterStandard?.max;
            return parameterStandardModel;
          },
        );
        return deviceModel;
      });

      // III. Update managers
      const thingManagers = managers.map((manager) => {
        const managerModel = new Manager();
        managerModel.userId = new ObjectId(manager.userId);
        managerModel.isOwner = manager.isOwner;
        return managerModel;
      });

      await this.thingCollection.updateOne(
        {
          _id: thingId,
        },
        {
          $set: {
            name,
            information,
            location,
            managers: thingManagers,
            devices: associatedDevices,
            updatedBy: user._id,
            updatedOn: new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();
      // response
      const response = new SaveThingResponse();
      response.msg = 'thing-updated-success';
      response.id = thingId.toString();
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

  public async updateCertificate(
    thingId: ObjectId,
    user: UserModel,
  ): Promise<SaveThingResponse> {
    const thing = await this.isExist({ _id: thingId });
    if (!checkValueExistInObjectArray(thing.managers, 'userId', user._id)) {
      throw new BadRequestException('no-permission');
    }
    const certificate = thing?.certificate;
    const thingObjectIdString = thingId.toString();
    if (certificate) {
      await this.awsService.deleteCert(
        certificate.certId,
        certificate.certArn,
        thingObjectIdString,
      );
    }

    const newCert = await this.awsService.createCertificate(
      thingObjectIdString,
    );

    const model = new Certificate();
    model.certArn = newCert.certArn;
    model.certId = newCert.certId;

    await this.thingCollection.updateOne(
      {
        _id: thingId,
      },
      {
        $set: {
          certificate: model,
          updatedBy: user._id,
          updatedOn: new Date(),
        },
      },
    );

    const streamFiles: Array<CertificateFile> = [
      {
        file: Buffer.from(newCert.awsRootCaPem, 'utf-8'),
        name: `${thingId.toString()}-root.pem`,
        type: 'root-ca',
      },
      {
        file: Buffer.from(newCert.thingCertPem, 'utf-8'),
        name: `${thingId.toString()}-certificate.pem.crt`,
        type: 'device-certificatie',
      },
      {
        file: Buffer.from(newCert.keyPair.privateKey, 'utf-8'),
        name: `${thingId.toString()}-private.pem.key`,
        type: 'private-key',
      },
      {
        file: Buffer.from(newCert.keyPair.publicKey, 'utf-8'),
        name: `${thingId.toString()}-public.pem.key`,
        type: 'public-key',
      },
    ];
    const response = new SaveThingResponse();
    response.msg = 'thing-certificate-update-success';
    response.files = streamFiles;
    response.id = thingId.toString();
    return response;
  }

  public async detail(thingId: ObjectId, user: UserModel) {
    const match = { $and: [] };
    match['$and'].push({ _id: thingId, isDeleted: false });
    if (user.role !== ROLE.ADMIN) {
      match['$and'].push({ 'managers.userId': user._id });
    }

    const thing = await this.thingCollection
      .aggregate([
        { $match: match },
        {
          $lookup: {
            from: NormalCollection.USER,
            localField: 'managers.userId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  ...EXCULDE_BASE_MODEL,
                },
              },
            ],
            as: 'managers.user',
          },
        },
      ])
      .toArray();

    if (!thing.length) throw new NotFoundException('thing-not-found');
    return thing[0];
  }

  public async list(
    { skip, page, limit, q, sortBy, sortOrder, status }: ListThingDto,
    user: UserModel,
  ) {
    const match = { $and: [] };
    if (user.role !== ROLE.ADMIN) {
      match['$and'].push({ 'managers.userId': user._id });
    }

    if (q)
      match['$and'].push({
        $or: [
          { 'managers.firstName': findRelative(q) },
          { 'managers.lastName': findRelative(q) },
          { 'managers.email': findRelative(q) },
          { 'managers.fullName': findRelative(q) },
          { name: findRelative(q) },
          { information: findRelative(q) },
          { 'location.name': findRelative(q) },
          { 'location.address': findRelative(q) },
        ],
      });

    if (status) match['status'] = status;

    !match['$and'].length && delete match['$and'];

    const things = await this.thingCollection
      .aggregate([
        {
          $lookup: {
            from: NormalCollection.USER,
            localField: 'managers.userId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  ...EXCULDE_BASE_MODEL,
                },
              },
            ],
            as: 'managers.user',
          },
        },
        { $match: match },
        { $sort: { [`${sortBy}`]: sortOrder } },
        {
          $facet: {
            paginatedResults: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
        {
          $set: {
            page,
            limit,
            total: { $first: '$totalCount.count' },
            current: { $size: '$paginatedResults' },
          },
        },
        { $unset: 'totalCount' },
      ])
      .toArray();

    return things[0];
  }

  public async updateAssociatedDevice(
    thingId: ObjectId,
    deviceName: string,
    { name, information, model, type, parameterStandards }: DeviceDto,
    user: UserModel,
  ): Promise<SaveThingResponse> {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      // I. Validate data
      const thing = await this.isExist({ _id: thingId }, session);
      const devices = thing.devices;
      const toBeUpdateDeviceIndex = devices.findIndex(
        (device) => device.name === deviceName,
      );
      if (toBeUpdateDeviceIndex === -1) {
        throw new NotFoundException('device-not-exist');
      }
      if (
        name !== deviceName &&
        checkValueExistInObjectArray(devices, 'name', name)
      ) {
        throw new NotFoundException('device-name-exist');
      }
      if (!checkValueExistInObjectArray(thing.managers, 'userId', user._id)) {
        throw new BadRequestException('no-permission');
      }

      // II. Update new device
      const updatedDevice = new Device();
      updatedDevice.name = name;
      updatedDevice.information = information;
      updatedDevice.model = model;
      updatedDevice.type = type;
      updatedDevice.parameterStandards = parameterStandards;
      devices[toBeUpdateDeviceIndex] = updatedDevice;

      await this.thingCollection.updateOne(
        {
          _id: thingId,
        },
        {
          $set: {
            devices,
            updatedBy: user._id,
            updatedOn: new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();

      const response = new SaveThingResponse();
      response.msg = 'device-updated-success';
      response.id = name;
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

  public async listDevices(thingId: ObjectId, user?: UserModel) {
    const match = {};
    match['_id'] = thingId;
    user && (match['managers.userId'] = user._id);
    const thing = (await this.thingCollection
      .aggregate([
        {
          $match: match,
        },
        {
          $project: {
            devices: 1,
          },
        },
      ])
      .toArray()) as ThingModel[];

    if (thing.length === 0) {
      throw new NotFoundException('thing-not-exist');
    }

    return thing[0].devices;
  }

  public async updateStatusActive(thingId: ObjectId) {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      // I. Validate data
      const thing = await this.isExist({ _id: thingId }, session);

      // II. Update devices
      const updateDevices = thing.devices?.map((device) => {
        device['status'] = DEVICE_STATUS.INACTIVE;
        return device;
      });

      await this.thingCollection.updateOne(
        {
          _id: thingId,
        },
        {
          $set: {
            status: DEVICE_STATUS.ACTIVE,
            devices: updateDevices,
            updatedOn: new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();
      // response
      const response = new SaveThingResponse();
      response.msg = 'thing-updated-success';
      response.id = thingId.toString();
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

  public async updateStatusInactive(thingId: ObjectId) {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      // I. Validate data
      const thing = await this.isExist({ _id: thingId }, session);

      // II. Update devices
      const updateDevices = thing.devices?.map((device) => {
        device['status'] = DEVICE_STATUS.INACTIVE;
        return device;
      });

      await this.thingCollection.updateOne(
        {
          _id: thingId,
        },
        {
          $set: {
            status: DEVICE_STATUS.INACTIVE,
            devices: updateDevices,
            updatedOn: new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();
      // response
      const response = new SaveThingResponse();
      response.msg = 'thing-updated-success';
      response.id = thingId.toString();
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

  public validateThingData(data: ThingData, devices: Device[]) {
    if (devices.length === 0) {
      return;
    }

    devices.forEach((device) => {
      device.parameterStandards.forEach((parameter, j) => {
        const value = data[`${parameter.name.toLowerCase()}`];
        if (!value) {
          return;
        }

        let message: string;
        let type: string;
        if (parameter?.max && value > parameter.max) {
          message = PARAMETER_MESSAGE.ABOVE_STANDARD;
          type = TYPE.WARNING;
        } else if (parameter?.min && value < parameter.min) {
          message = PARAMETER_MESSAGE.BELOW_STANDARD;
          type = TYPE.WARNING;
        } else {
          message = PARAMETER_MESSAGE.STANDARD;
        }

        device.parameterStandards[j]['message'] = message;
        device.parameterStandards[j]['value'] = value;
        type && (device.parameterStandards[j]['type'] = type);
      });
    });

    return devices;
  }

  public async isNameExist(
    name: string,
    filter?: object,
    session?: ClientSession,
  ): Promise<boolean> {
    const filterObject = Object.assign(filter, {
      name,
      isDeleted: false,
    });
    const nameIsExist = await this.thingCollection.findOne(filterObject, {
      session,
    });
    if (nameIsExist) throw new BadRequestException('thing-name-existed');

    return false;
  }

  public async isExist(
    filter: object,
    session?: ClientSession,
  ): Promise<ThingModel> {
    const filterObject = Object.assign(filter, {
      isDeleted: false,
    });
    const nameIsExist = (await this.thingCollection.findOne(filterObject, {
      session,
    })) as ThingModel;
    if (!nameIsExist) throw new NotFoundException('thing-not-existed');

    return nameIsExist;
  }
}
