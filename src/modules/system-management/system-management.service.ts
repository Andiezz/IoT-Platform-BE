import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { InjectClient, InjectCollection } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { CreateAccountDTO } from 'src/shared/dto/request/system-management/create-account.request';
import { UserModel } from 'src/shared/models/user.model';
import { AdminUpdateAccountDTO } from 'src/shared/dto/request/system-management/admin-update-account.request';
import { EmailService } from '../email-service/email.service';
import {
  CREATE_USER_DEFAULT,
  StatusUser,
} from 'src/shared/constants/system-management.constants';
import { JwtService } from '../jwt/jwt.service';
import { ListAccountsDTO } from 'src/shared/dto/request/system-management/list-accounts.request';
import { GetAccountResponse } from 'src/shared/dto/response/system-management/getAccount.response';
import { AuthenticationService } from 'src/authentication/authentication.service';
import {
  AppConfiguration,
  JwtConfiguration,
  MailerConfiguration,
} from 'src/shared/configuration/configuration';
import { SendMailOptions } from 'src/modules/email-service/interfaces';
import { UserService } from '../user/user.service';
import { ResentActiveLinkDTO } from 'src/shared/dto/request/authentication/resentActiveLink.request';
import { ResentActiveLinkResponse } from 'src/shared/dto/response/authentication/resentActiveLink.response';
import { DecodeInfo } from '../jwt/interfaces';

@Injectable()
export class SystemManagementService {
  private readonly logger: Logger = new Logger(SystemManagementService.name);

  constructor(
    private readonly cfg: ConfigService,
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    @InjectClient()
    private readonly client: MongoClient,
    private readonly userService: UserService,
  ) {}

  public async createAccount(body: CreateAccountDTO, actionBy: UserModel) {
    const user: Partial<UserModel> = {
      ...body,
    };

    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      // Validate inputs
      const existed = await db
        .collection(NormalCollection.USER)
        .findOne({ email: user.email }, { session });
      if (existed) {
        throw new BadRequestException('This email address has already existed');
      }

      // Set default fields
      user['isActive'] = CREATE_USER_DEFAULT.IS_ACTIVE;
      user['isFirstLogin'] = CREATE_USER_DEFAULT.IS_FIRST_LOGIN;
      !user.phoneCode && (user['phoneCode'] = CREATE_USER_DEFAULT.PHONE_CODE);
      user.createdBy = actionBy._id;

      // Save user information
      const insertedUser = await db.collection(NormalCollection.USER).insertOne(
        {
          ...user,
          createdOn: new Date(),
          updatedOn: new Date(),
        },
        { session },
      );
      const userId = insertedUser.insertedId;

      // Generate token for activation and send to user's email address
      const jwt = this.cfg.getOrThrow<JwtConfiguration>('jwt');
      const activationCode = await this.jwtService.generateToken(
        { isNew: true },
        jwt.jwtLifetimeActivation,
      );

      const app = this.cfg.getOrThrow<AppConfiguration>('app');
      const mailer = this.cfg.getOrThrow<MailerConfiguration>('mailer');
      const createNewPasswordLink = `${app.url}/change-password?token=${activationCode}&isNew=true`;
      const options: SendMailOptions = {
        to: user.email,
        from: mailer.mailerSendFrom,
        subject: 'Welcome to our platform',
        template: 'activate_account.ejs',
        context: {
          firstName: user.firstName,
          createNewPasswordLink,
          emailSupport: mailer.emailSupport,
        },
      };

      const res = await this.emailService.sendMail(options);
      if (!res) {
        throw new BadRequestException('Sent email unsuccessfully');
      }

      await db
        .collection(NormalCollection.USER)
        .findOneAndUpdate(
          { _id: new ObjectId(userId) },
          { $set: { activationCode: activationCode, updatedOn: new Date() } },
          { session },
        );

      session.inTransaction() && (await session.commitTransaction());

      return user as UserModel;
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        SystemManagementService.name,
      );
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async updateAccount(
    userId: string,
    body: AdminUpdateAccountDTO,
    actionBy: UserModel,
  ) {
    const userObjectId = new ObjectId(userId);
    const {
      firstName,
      lastName,
      email,
      isActive,
      phoneCode,
      phoneNumber,
      role,
    } = body;

    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      const user = await this.userService.findUser(
        { _id: userObjectId },
        session,
      );
      if (user.isFirstLogin) {
        throw new BadRequestException(
          'Please activate this account before updating information',
        );
      }

      const toBeUpdated = {};

      if (user.firstName !== firstName || user.lastName !== lastName) {
        toBeUpdated['firstName'] = firstName;
        toBeUpdated['lastName'] = lastName;
      }

      if (user.phoneCode !== phoneCode || user.phoneNumber !== phoneNumber) {
        toBeUpdated['phoneCode'] = phoneCode;
        toBeUpdated['phoneNumber'] = phoneNumber;
      }

      if (user.isActive !== isActive) {
        toBeUpdated['isActive'] = isActive;

        // Send mail to user's email address if isActive=false
        await this.sendMailUserInactive(isActive, user);
      }

      email && (toBeUpdated['email'] = email);
      role && (toBeUpdated['role'] = role);

      const updated = (
        await db.collection(NormalCollection.USER).findOneAndUpdate(
          { _id: userObjectId },
          { $set: { ...toBeUpdated, updatedOn: new Date() } },
          {
            session,
            projection: { salt: 0, hash: 0, activationCode: 0 },
            returnDocument: 'after',
            upsert: true,
          },
        )
      ) as UserModel;

      session.inTransaction() && (await session.commitTransaction());

      return updated;
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        SystemManagementService.name,
      );
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async sendMailUserInactive(
    isActive: boolean,
    user: UserModel,
  ): Promise<void> {
    const mailer = this.cfg.getOrThrow<MailerConfiguration>('mailer');
    if (isActive === false) {
      const options: SendMailOptions = {
        to: user.email,
        from: mailer.mailerSendFrom,
        subject: 'Notification of Account Status Change',
        template: 'account_status_change.ejs',
        context: {
          firstName: user.firstName,
          emailSupport: mailer.emailSupport,
        },
      };

      const res = await this.emailService.sendMail(options);
      if (!res) {
        throw new BadRequestException('Send mail unsuccessfully');
      }
    }
  }

  async listAccounts(query: ListAccountsDTO, user: UserModel) {
    try {
      const { q, isActive, role, page, limit, sortBy, sortOrder, skip } = query;

      const matchFilters = {};
      if (q) {
        matchFilters['$and'] = [
          {
            $or: [
              { firstName: { $regex: q, $options: 'i' } },
              { lastName: { $regex: q, $options: 'i' } },
              { email: { $regex: q, $options: 'i' } },
              { fullName: { $regex: q, $options: 'i' } },
            ],
          },
        ];
      }
      ![undefined, null].includes(isActive) &&
        (matchFilters['isActive'] = isActive);
      role && (matchFilters['role'] = role);

      const data = await this.userCollection
        .aggregate([
          {
            $lookup: {
              from: NormalCollection.USER_MANAGE,
              localField: '_id',
              foreignField: 'userId',
              pipeline: [
                {
                  $lookup: {
                    from: NormalCollection.THING,
                    localField: 'thingId',
                    foreignField: '_id',
                    pipeline: [
                      {
                        $project: {
                          name: 1,
                          status: 1,
                        },
                      },
                    ],
                    as: 'thing',
                  },
                },
                {
                  $unwind: '$thing',
                },
              ],
              as: 'owners',
            },
          },
          {
            $project: { hash: 0, salt: 0 },
          },
          {
            $addFields: {
              fullName: { $concat: ['$firstName', ' ', '$lastName'] },
            },
          },
          { $match: matchFilters },
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

      for (let i = 0; i < data[0].paginatedResults.length; i++) {
        const user = data[0].paginatedResults[i] as UserModel;

        if (user?.activationCode) {
          const decodeToken = (await this.jwtService.decode(
            user.activationCode,
          )) as DecodeInfo;
          const isExpiredActivationCode =
            new Date(decodeToken.exp).getTime() * 1000 > new Date().getTime()
              ? false
              : true;
          user['isExpiredActivationCode'] = isExpiredActivationCode;
        }

        delete user.activationCode;
      }

      return data[0];
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        SystemManagementService.name,
      );
      throw new BadRequestException(error);
    }
  }

  async getAccount(accountId: string): Promise<GetAccountResponse> {
    let user: UserModel = await this.userService.findUser({
      _id: new ObjectId(accountId),
    });

    const response = new GetAccountResponse();
    response.id = user._id.toString();
    response.firstName = user.firstName;
    response.lastName = user.lastName;
    response.email = user.email;
    response.phoneCode = user.phoneCode;
    response.phoneNumber = user.phoneNumber;
    response.role = user.role;
    response.isActive = user.isActive;
    return response;
  }

  async resentActiveLink(
    body: ResentActiveLinkDTO,
  ): Promise<ResentActiveLinkResponse> {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      const user: UserModel = await this.userService.findUser({
        email: body.email,
      });

      // Generate token for activation and send to user's email address
      const jwt = this.cfg.getOrThrow<JwtConfiguration>('jwt');
      const activationCode = await this.jwtService.generateToken(
        { isNew: true },
        jwt.jwtLifetimeActivation,
      );

      const app = this.cfg.getOrThrow<AppConfiguration>('app');
      const mailer = this.cfg.getOrThrow<MailerConfiguration>('mailer');
      const createNewPasswordLink = `${app.url}/change-password?token=${activationCode}&isNew=true`;
      const options: SendMailOptions = {
        to: user.email,
        from: mailer.mailerSendFrom,
        subject: 'Welcome to our platform',
        template: 'activate_account.ejs',
        context: {
          firstName: user.firstName,
          createNewPasswordLink,
          emailSupport: mailer.emailSupport,
        },
      };

      const res = await this.emailService.sendMail(options);

      await this.userCollection.findOneAndUpdate(
        { _id: new ObjectId(user._id) },
        { $set: { activationCode, updatedOn: new Date() } },
        { session },
      );

      if (!res) {
        throw new BadRequestException('resent-active-link-fail');
      }

      session.inTransaction() && (await session.commitTransaction());

      return { msg: 'resent-active-link-success' };
    } catch (error) {
      this.logger.error(
        error.message,
        error.stack,
        SystemManagementService.name,
      );
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }
}
