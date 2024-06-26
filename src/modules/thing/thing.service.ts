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
  ManagerThingDto,
  SaveThingDto,
} from 'src/shared/dto/request/thing/create.request';
import {
  CertificateFile,
  ManagerThingResponse,
  SaveThingResponse,
} from 'src/shared/dto/response/thing/create.response';
import {
  Certificate,
  DEVICE_STATUS,
  Device,
  DeviceWithEvaluatedParameters,
  Location,
  Manager,
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
import { PARAMETER_NAME, PARAMETER_THRESHOLD } from './thing.constant';
import { TYPE } from '../notification/template-notification';
import {
  ParameterStandardModel,
  Threshold,
} from 'src/shared/models/parameter-standard.model';
import { DeviceModelService } from '../device-model/device-model.service';
import { EvaluatedParameter } from 'src/shared/dto/request/notification/create.request';
import { UserService } from '../user/user.service';

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
    private readonly deviceModelService: DeviceModelService,
    private readonly userService: UserService,
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
      thingModel.devices = await Promise.all(
        devices.map(async (device) => {
          const deviceModel = new Device();
          deviceModel.name = device.name;
          deviceModel.status = DEVICE_STATUS.PENDING_SETUP;
          deviceModel.model = device.model;
          deviceModel.parameterStandardDefault =
            device.parameterStandardDefault;

          // parameter standard custom
          if (deviceModel.parameterStandardDefault === false) {
            deviceModel.parameterStandards = device.parameterStandards.map(
              (parameterStandard) => {
                const parameterStandardModel = new ParameterStandardModel();
                parameterStandardModel.name = parameterStandard.name;
                parameterStandardModel.unit = parameterStandard.unit;
                parameterStandardModel.weight = parameterStandard.weight;
                parameterStandardModel.thresholds =
                  parameterStandard.thresholds;
                return parameterStandardModel;
              },
            );
          } else {
            // parameter standard default value
            const deviceDefaultModel =
              await this.deviceModelService.getDeviceModel(device.model);
            deviceModel.parameterStandards =
              deviceDefaultModel.parameterStandards as ParameterStandardModel[];
          }

          return deviceModel;
        }),
      );

      // II.2 Assign managers
      thingModel.managers = await Promise.all(
        managers.map(async (manager) => {
          const managerModel = new Manager();
          managerModel.userId = new ObjectId(manager.userId);
          managerModel.isOwner = manager.isOwner;
          const managerDetail = await this.userService.findUser(
            { _id: new ObjectId(manager.userId) },
            session,
          );
          managerModel.email = managerDetail.email;
          return managerModel;
        }),
      );

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
        throw new BadRequestException('device-name-exist');
      }

      // II. Update devices
      const associatedDevices = await Promise.all(
        devices.map(async (device) => {
          const deviceModel = new Device();
          deviceModel.name = device.name;
          deviceModel.status = DEVICE_STATUS.PENDING_SETUP;
          deviceModel.model = device.model;
          deviceModel.parameterStandardDefault =
            device.parameterStandardDefault;
          // parameter standard custom
          if (deviceModel.parameterStandardDefault === false) {
            deviceModel.parameterStandards = device.parameterStandards.map(
              (parameterStandard) => {
                const parameterStandardModel = new ParameterStandardModel();
                parameterStandardModel.name = parameterStandard.name;
                parameterStandardModel.unit = parameterStandard.unit;
                parameterStandardModel.weight = parameterStandard.weight;
                parameterStandardModel.thresholds =
                  parameterStandard.thresholds;
                return parameterStandardModel;
              },
            );
          } else {
            // parameter standard default value
            const deviceDefaultModel =
              await this.deviceModelService.getDeviceModel(device.model);
            deviceModel.parameterStandards =
              deviceDefaultModel.parameterStandards as ParameterStandardModel[];
          }
          return deviceModel;
        }),
      );

      // III. Update managers
      const thingManagers = await Promise.all(
        managers.map(async (manager) => {
          const managerModel = new Manager();
          managerModel.userId = new ObjectId(manager.userId);
          managerModel.isOwner = manager.isOwner;
          const managerDetail = await this.userService.findUser(
            { _id: new ObjectId(manager.userId) },
            session,
          );
          managerModel.email = managerDetail.email;
          return managerModel;
        }),
      );

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
    const session = this.client.startSession();
    try {
      session.startTransaction();
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
    } catch (error) {
      this.logger.error(error);
      session.inTransaction() && (await session.abortTransaction());
      await session.endSession();
      throw new BadRequestException(error.message);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  public async detail(
    thingId: ObjectId,
    user: UserModel,
    excludeFields: object = {},
  ) {
    try {
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
              as: 'managers2',
            },
          },
          {
            $addFields: {
              managers: {
                $map: {
                  input: '$managers',
                  as: 'manager',
                  in: {
                    $mergeObjects: [
                      '$$manager',
                      {
                        $arrayElemAt: [
                          '$managers2',
                          {
                            $indexOfArray: [
                              '$managers2._id',
                              '$$manager.userId',
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $unwind: {
              path: '$devices',
            },
          },
          {
            $lookup: {
              from: NormalCollection.DEVICE_MODEL,
              localField: 'devices.model',
              foreignField: '_id',
              let: {
                dName: '$devices.name',
                dStatus: '$devices.status',
                dParameterStandardDefault: '$devices.parameterStandardDefault',
                dParameterStandards: '$devices.parameterStandards',
              },
              pipeline: [
                {
                  $project: {
                    ...EXCULDE_BASE_MODEL,
                  },
                },
                {
                  $project: {
                    name: '$$dName',
                    status: '$$dStatus',
                    model: '$$ROOT',
                    parameterStandardDefault: '$$dParameterStandardDefault',
                    parameterStandards: '$$dParameterStandards',
                  },
                },
              ],
              as: 'devices',
            },
          },
          {
            $unwind: {
              path: '$devices',
            },
          },
          {
            $group: {
              _id: '$_id',
              name: { $first: '$name' },
              information: { $first: '$information' },
              location: { $first: '$location' },
              status: { $first: '$status' },
              managers: { $first: '$managers' },
              createdBy: { $first: '$createdBy' },
              updatedBy: { $first: '$updatedBy' },
              createdOn: { $first: '$createdOn' },
              updatedOn: { $first: '$updatedOn' },
              devices: {
                $push: '$devices',
              },
            },
          },
          {
            $project: {
              certificate: 0,
              ...excludeFields,
            },
          },
        ])
        .toArray();

      if (!thing.length) throw new NotFoundException('thing-not-found');
      return thing[0] as ThingModel;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async list(
    { skip, page, limit, q, sortBy, sortOrder, status, userId }: ListThingDto,
    user: UserModel,
  ) {
    try {
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
      if (userId) match['managers._id'] = new ObjectId(userId);

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
              as: 'managers2',
            },
          },
          {
            $addFields: {
              managers: {
                $map: {
                  input: '$managers',
                  as: 'manager',
                  in: {
                    $mergeObjects: [
                      '$$manager',
                      {
                        $arrayElemAt: [
                          '$managers2',
                          {
                            $indexOfArray: [
                              '$managers2._id',
                              '$$manager.userId',
                            ],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            },
          },
          {
            $unwind: {
              path: '$devices',
            },
          },
          {
            $lookup: {
              from: NormalCollection.DEVICE_MODEL,
              localField: 'devices.model',
              foreignField: '_id',
              let: {
                dName: '$devices.name',
                dStatus: '$devices.status',
                dParameterStandardDefault: '$devices.parameterStandardDefault',
                dParameterStandards: '$devices.parameterStandards',
              },
              pipeline: [
                {
                  $project: {
                    ...EXCULDE_BASE_MODEL,
                    _id: 0,
                  },
                },
                {
                  $project: {
                    name: '$$dName',
                    status: '$$dStatus',
                    model: '$$ROOT',
                    parameterStandardDefault: '$$dParameterStandardDefault',
                    parameterStandards: '$$dParameterStandards',
                  },
                },
              ],
              as: 'devices',
            },
          },
          {
            $unwind: {
              path: '$devices',
            },
          },
          {
            $group: {
              _id: '$_id',
              name: { $first: '$name' },
              information: { $first: '$information' },
              location: { $first: '$location' },
              status: { $first: '$status' },
              managers: { $first: '$managers' },
              createdBy: { $first: '$createdBy' },
              updatedBy: { $first: '$updatedBy' },
              createdOn: { $first: '$createdOn' },
              updatedOn: { $first: '$updatedOn' },
              devices: {
                $push: '$devices',
              },
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
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async updateAssociatedDevice(
    thingId: ObjectId,
    deviceName: string,
    { name, model, parameterStandards, parameterStandardDefault }: DeviceDto,
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
      updatedDevice.model = model;

      if (parameterStandardDefault === false) {
        updatedDevice.parameterStandards =
          parameterStandards as ParameterStandardModel[];
      } else {
        // parameter standard default value
        const deviceDefaultModel = await this.deviceModelService.getDeviceModel(
          model,
        );
        updatedDevice.parameterStandards =
          deviceDefaultModel.parameterStandards as ParameterStandardModel[];
      }

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
    try {
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
        throw new NotFoundException('thing-not-found');
      }

      return thing[0].devices;
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException(error.message);
    }
  }

  public async delete(thingId: ObjectId, user: UserModel) {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      // I. Validate data
      const thing = await this.isExist({ _id: thingId }, session);
      if (!checkValueExistInObjectArray(thing.managers, 'userId', user._id)) {
        throw new BadRequestException('no-permission');
      }
      if (thing.status !== DEVICE_STATUS.PENDING_SETUP) {
        throw new BadRequestException('thing-not-allowed-delete');
      }

      // II. Update thing
      await this.thingCollection.updateOne(
        {
          _id: thingId,
        },
        {
          $set: {
            isDeleted: true,
            updatedBy: user._id,
            updatedOn: new Date(),
          },
        },
        { session },
      );

      await session.commitTransaction();
      // response
      const response = new SaveThingResponse();
      response.msg = 'thing-deleted-success';
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
    if (!nameIsExist) throw new NotFoundException('thing-not-found');

    return nameIsExist;
  }

  public async manager({
    email,
  }: ManagerThingDto): Promise<ManagerThingResponse> {
    const manager = await this.userService.findUser({
      email,
    });
    if (!manager) throw new NotFoundException('manager-not-found');
    if (!manager.isActive) throw new BadRequestException('manager-not-active');

    const response = new ManagerThingResponse();
    response.msg = 'manager-found';
    response.user = {
      id: manager._id,
      firstName: manager.firstName,
      lastName: manager.lastName,
      email: manager.email,
      avatar: manager.avatar,
    };
    return response;
  }

  public validateThingData(data: ThingData, devices: Device[]) {
    if (devices.length === 0) {
      return;
    }

    const evaluatedDeviceData = devices.map((device) => {
      const evaluatedDevice = new DeviceWithEvaluatedParameters();
      evaluatedDevice.name = device.name;
      evaluatedDevice.model = device.model;
      evaluatedDevice.status = device.status;
      evaluatedDevice.parameterStandards = device.parameterStandards;
      evaluatedDevice.parameterStandardDefault =
        device.parameterStandardDefault;
      evaluatedDevice.evaluatedParameterStandards = [];

      device.parameterStandards.forEach((parameter) => {
        const value = data[`${parameter.name.toLowerCase().replace('.', '')}`];
        if (!value) {
          return;
        }

        // skip if value is fine
        const threshold = this.getThingValueThreshold(value, parameter);
        if (
          [
            PARAMETER_THRESHOLD.GOOD.name,
            PARAMETER_THRESHOLD.MODERATE.name,
            PARAMETER_THRESHOLD.SENSITIVE_UNHEALTHY.name,
          ].includes(threshold.name)
        ) {
          const evaluatedParameter = new EvaluatedParameter();
          evaluatedParameter.name = parameter.name;
          evaluatedParameter.unit = parameter.unit;
          evaluatedParameter.weight = parameter.weight;
          evaluatedParameter.value = value;
          evaluatedParameter.threshold = threshold;
          evaluatedParameter.type = TYPE.NORMAL;

          evaluatedDevice.evaluatedParameterStandards.push(evaluatedParameter);
          return;
        }

        // create parameter with the evaluated result
        const evaluatedParameter = new EvaluatedParameter();
        evaluatedParameter.name = parameter.name;
        evaluatedParameter.unit = parameter.unit;
        evaluatedParameter.weight = parameter.weight;
        evaluatedParameter.value = value;
        evaluatedParameter.threshold = threshold;
        evaluatedParameter.type = TYPE.WARNING;

        evaluatedDevice.evaluatedParameterStandards.push(evaluatedParameter);
      });
      return evaluatedDevice;
    });

    return evaluatedDeviceData;
  }

  // get the threshold the value is in
  getThingValueThreshold(value: number, parameter: ParameterStandardModel) {
    let evaluatedValueThreshold = parameter.thresholds[parameter.thresholds.length - 1];
    parameter.thresholds.forEach((threshold) => {
      if (value >= threshold.min && value < threshold.max) {
        evaluatedValueThreshold = threshold;
      }
    });
    return evaluatedValueThreshold;
  }
}
