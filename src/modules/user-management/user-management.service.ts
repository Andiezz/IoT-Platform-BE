import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, genSalt } from 'bcrypt';
import { InjectClient, InjectCollection } from '../mongodb';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserModel } from 'src/shared/models/user.model';
import { ActivateAccountDTO } from 'src/shared/dto/request/user-management/activate-account.request';
import { UserUpdateAccountDTO } from 'src/shared/dto/request/user-management/user-update-account.request';
import { JwtService } from '../jwt/jwt.service';
import { CREATE_USER_DEFAULT } from 'src/shared/constants/system-management.constants';
import { UserService } from '../user/user.service';

@Injectable()
export class UserManagementService {
  private readonly logger: Logger = new Logger(UserManagementService.name);

  constructor(
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
    private readonly jwtService: JwtService,
    private userService: UserService,
    @InjectClient()
    private readonly client: MongoClient,
  ) {}

  async activateAccount(body: ActivateAccountDTO) {
    const session = this.client.startSession();
    try {
      session.startTransaction();
      const { activationCode, newPassword, confirmNewPassword } = body;

      // verify password
      if (newPassword !== confirmNewPassword) {
        throw new BadRequestException('Passwords are not matched');
      }

      // verify token
      const user: UserModel = (
        await this.userCollection
          .aggregate([
            {
              $match: {
                activationCode,
              },
            },
          ])
          .toArray()
      )[0] as UserModel;
      if (!user) {
        throw new NotFoundException(
          'Create new password for new user unsuccessfully',
        );
      }

      const decoded = await this.jwtService.verifyToken(activationCode);
      if (!decoded || !user.activationCode) {
        throw new UnauthorizedException('Invalid token');
      }

      // generate hash and save
      const salt = await genSalt(CREATE_USER_DEFAULT.SALT_HASH);
      const hashPass = await hash(`${salt}.${newPassword}`, salt);

      const activatedUser = await this.userCollection.findOneAndUpdate(
        { _id: new ObjectId(user._id) },
        {
          $set: {
            salt,
            hash: hashPass,
            isActive: true,
            isFirstLogin: false,
            activationCode: '',
          },
        },
        {
          projection: { salt: 0, hash: 0, activationCode: 0 },
          returnDocument: 'after',
          session,
        },
      );

      session.inTransaction() && (await session.commitTransaction());

      return activatedUser;
    } catch (error) {
      this.logger.error(error.message, error.stack, UserManagementService.name);
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }

  async updateAccount(userId: string, body: UserUpdateAccountDTO) {
    const session = this.client.startSession();
    try {
      session.startTransaction();

      const user = await this.userService.findUser(
        {
          _id: new ObjectId(userId),
        },
        session,
      );

      if (user?.isFirstLogin) {
        throw new BadRequestException(
          'Please activate this account before updating information',
        );
      }

      const updated = (
        await this.userCollection.findOneAndUpdate(
          { _id: new ObjectId(userId) },
          { $set: body },
          {
            projection: { salt: 0, hash: 0, activationCode: 0 },
            returnDocument: 'after',
            session,
          },
        )
      ).value as UserModel;

      session.inTransaction() && (await session.commitTransaction());

      return updated;
    } catch (error) {
      this.logger.error(error.message, error.stack, UserManagementService.name);
      session.inTransaction() && (await session.abortTransaction());
      throw new BadRequestException(error);
    } finally {
      session.inTransaction() && (await session.endSession());
    }
  }
}
