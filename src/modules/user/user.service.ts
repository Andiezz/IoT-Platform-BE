import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { genSalt, hash } from 'bcrypt';
import { ClientSession, Collection, Db, MongoClient, ObjectId } from 'mongodb';
import { AuthenticationService } from 'src/authentication/authentication.service';
import { InjectClient, InjectCollection } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { ChangePasswordDTO } from 'src/shared/dto/request/user/changePassword.request';
import { UpdateProfileDTO } from 'src/shared/dto/request/user/updateProfile.request';
import { ChangePasswordResponse } from 'src/shared/dto/response/user/changePassword.response';
import { GetProfileResponse } from 'src/shared/dto/response/user/getProfile.response';
import { UpdateProfileResponse } from 'src/shared/dto/response/user/updateProfile.response';
import { UserModel } from 'src/shared/models/user.model';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from 'src/shared/configuration/configuration';
import { ListUsersDTO } from 'src/shared/dto/request/user/list-users.request';
import { CREATE_USER_DEFAULT } from 'src/shared/constants/system-management.constants';
import { EmailDTO } from 'src/shared/dto/request/user/email.request';

@Injectable()
export class UserService {
  private readonly logger: Logger = new Logger(UserService.name);
  constructor(
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
    private readonly cfg: ConfigService,
    @InjectClient()
    private readonly client: MongoClient,
  ) {}

  public async changePassword(
    userId: string,
    changePasswordDTO: ChangePasswordDTO,
  ): Promise<ChangePasswordResponse> {
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      const { newPassword } = changePasswordDTO;

      const user: UserModel = await this.findUser(
        {
          _id: new ObjectId(userId),
        },
        session,
      );

      const currentPassword = await hash(
        `${user.salt}.${newPassword}`,
        user.salt,
      );
      if (currentPassword === user.hash) {
        throw new BadRequestException(
          'Please enter a new password that is different from your current password.',
        );
      }

      const newSalt = await genSalt(CREATE_USER_DEFAULT.SALT_HASH);
      const newHash = await hash(`${newSalt}.${newPassword}`, newSalt);
      const updateUserResult = await db
        .collection(NormalCollection.USER)
        .updateOne(
          { _id: user._id },
          { $set: { salt: newSalt, hash: newHash } },
          { session },
        );

      if (
        !updateUserResult.acknowledged ||
        updateUserResult.modifiedCount == 0
      ) {
        throw new BadRequestException('change-password-fail');
      }

      session.inTransaction() && (await session.commitTransaction());

      return { msg: 'change-password-success' };
    } catch (error) {
      this.logger.error(error.message, error.stack, UserService.name);
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  public async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDTO,
    file: Express.Multer.File,
  ): Promise<UpdateProfileResponse> {
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      const { firstName, lastName, phoneCode, phoneNumber } = updateProfileDto;

      const user: UserModel = await this.findUser(
        {
          _id: new ObjectId(userId),
        },
        session,
      );

      const data = {};
      if (user.firstName !== firstName || user.lastName !== lastName) {
        data['firstName'] = firstName;
        data['lastName'] = lastName;
      }
      if (user.phoneCode !== phoneCode || user.phoneNumber !== phoneNumber) {
        data['phoneCode'] = phoneCode;
        data['phoneNumber'] = phoneNumber;
      }

      //avatar
      if (file) {
        // TODO: upload file to blob storage
      }

      const updateUserResult = await db
        .collection(NormalCollection.USER)
        .updateOne({ _id: user._id }, { $set: data }, { session });

      if (
        !updateUserResult.acknowledged ||
        updateUserResult.modifiedCount == 0
      ) {
        throw new BadRequestException('update-profile-fail');
      }

      session.inTransaction() && (await session.commitTransaction());
      return { msg: 'update-profile-success' };
    } catch (error) {
      this.logger.error(error.message, error.stack, UserService.name);
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  public async getProfile(userId: string): Promise<GetProfileResponse> {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      const user: UserModel = (await this.findUser(
        {
          _id: new ObjectId(userId),
        },
        session,
      )) as UserModel;

      const response = new GetProfileResponse();
      response.id = user._id.toString();
      response.firstName = user.firstName;
      response.lastName = user.lastName;
      response.phoneCode = user.phoneCode;
      response.phoneNumber = user.phoneNumber;
      response.email = user.email;
      response.avatar = user.avatar;
      response.role = user.role;

      session.inTransaction() && (await session.commitTransaction());
      return response;
    } catch (error) {
      this.logger.error(error.message, error.stack, UserService.name);
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  public async getListUser(query: ListUsersDTO) {
    try {
      const {
        q,
        isActive,
        excludeRoles,
        page,
        limit,
        sortBy,
        sortOrder,
        skip,
      } = query;

      const matchFilters = {};
      if (q) {
        matchFilters['$or'] = [
          { firstName: { $regex: q, $options: 'i' } },
          { lastName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { fullName: { $regex: q, $options: 'i' } },
        ];
      }
      ![undefined, null].includes(isActive) &&
        (matchFilters['isActive'] = isActive);

      excludeRoles.length &&
        (matchFilters['user_role.role.role'] = { $nin: excludeRoles });


      const data = await this.userCollection
        .aggregate([
          { $project: { hash: 0, salt: 0, activationCode: 0 } },
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

      return data[0];
    } catch (error) {
      this.logger.error(error.message, error.stack, UserService.name);
      throw new BadRequestException(error);
    }
  }

  public async getUserByEmail(body: EmailDTO) {
    const { email } = body;
    const user = await this.findUser({ email });

    return {
      _id: user._id,
      email: user.email,
      avatar: user.avatar,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  public async findUser(
    query: Object = {},
    session?: ClientSession,
  ): Promise<UserModel> {
    const user = (await this.userCollection.findOne(
      query,
      { session },
    )) as UserModel;
    if (!user) {
      throw new NotFoundException('no-user-found');
    }

    return user;
  }
}
