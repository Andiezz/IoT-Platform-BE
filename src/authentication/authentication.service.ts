import {
  BadGatewayException,
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from 'src/modules/jwt/jwt.service';
import { LoginDTO } from 'src/shared/dto/request/authentication/login.request';
import { LoginResponse } from 'src/shared/dto/response/authentication/login.response';
import { compare, genSalt, hash } from 'bcrypt';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { InjectClient, InjectCollection } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserModel } from 'src/shared/models/user.model';
import { UserLoginModel } from 'src/shared/models/user-login.model';
import { ConfigService } from '@nestjs/config';
import {
  AppConfiguration,
  JwtConfiguration,
  MailerConfiguration,
} from 'src/shared/configuration/configuration';
import { CreateNewPasswordDTO } from 'src/shared/dto/request/authentication/createNewPassword.request';
import { ForgotPasswordDTO } from 'src/shared/dto/request/authentication/forgotPassword.request';
import { AuthTokenInfo } from 'src/modules/jwt/interfaces';
import { EmailService } from 'src/modules/email-service/email.service';
import { SendMailOptions } from 'src/modules/email-service/interfaces';
import { ForgotPasswordResponse } from 'src/shared/dto/response/authentication/forgotPassword.response';
import { CreateNewPasswordResponse } from 'src/shared/dto/response/authentication/createNewPassword.response';
import { CREATE_USER_DEFAULT } from 'src/shared/constants/system-management.constants';
import { isType } from 'src/shared/utils/is-type.utils';
import { RefreshTokenDTO } from 'src/shared/dto/request/authentication/refreshToken.request';
import { RefreshTokenResponse } from 'src/shared/dto/response/authentication/refreshToken.response';
import { UserService } from 'src/modules/user/user.service';

@Injectable()
export class AuthenticationService {
  private readonly logger: Logger = new Logger(AuthenticationService.name);
  constructor(
    private readonly cfg: ConfigService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
    @InjectCollection(NormalCollection.USER_LOGIN)
    private readonly userLoginCollection: Collection,
    @InjectClient()
    private readonly client: MongoClient,
  ) {}

  public async signToken(
    payload: Record<string, unknown>,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const accessToken = await this.signAccessToken(payload);
      const refreshToken = await this.signRefreshToken(payload);
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      throw new BadRequestException(error);
    }
  }

  public async signAccessToken(
    payload: Record<string, unknown>,
  ): Promise<string> {
    try {
      const jwt = this.cfg.getOrThrow<JwtConfiguration>('jwt');
      const token = await this.jwtService.generateToken(
        payload,
        jwt.jwtLifetimeAccessToken,
      );
      return token;
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      throw new BadRequestException(error);
    }
  }

  public async signRefreshToken(
    payload: Record<string, unknown>,
  ): Promise<string> {
    try {
      const jwt = this.cfg.getOrThrow<JwtConfiguration>('jwt');
      const token = await this.jwtService.generateToken(
        payload,
        jwt.jwtLifetimeRefreshToken,
      );
      return token;
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      throw new BadRequestException(error);
    }
  }

  public async refreshToken({
    token,
  }: RefreshTokenDTO): Promise<RefreshTokenResponse> {
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();
      const userLogin: UserLoginModel = (await db
        .collection(NormalCollection.USER_LOGIN)
        .findOne(
          {
            token,
          },
          { session },
        )) as UserLoginModel;

      if (!userLogin) {
        throw new BadRequestException('refresh-token-not-found');
      }

      if (userLogin.ttl.getTime() <= new Date().getTime()) {
        throw new BadRequestException('expired-token');
      }

      const decodeToken = await this.jwtService.decodeToken(token);
      if (!isType<AuthTokenInfo>(decodeToken) || !decodeToken.userId) {
        throw new BadRequestException('invalid-token');
      }

      const user = await this.userCollection.findOne(
        {
          _id: new ObjectId(decodeToken.userId),
        },
        { session },
      );
      const accessToken = await this.signAccessToken({
        userId: user._id,
        status: user.isActive,
      });

      await session.commitTransaction();

      return { accessToken };
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      await session.abortTransaction();
      throw new BadRequestException(error);
    } finally {
      await session.endSession();
    }
  }

  public async login(loginDto: LoginDTO): Promise<LoginResponse> {
    const jwt = this.cfg.getOrThrow<JwtConfiguration>('jwt');
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      const user: UserModel = await this.userService.findUser(
        {
          email: loginDto.email,
        },
        session,
      );
      if (!user.isActive || user.isFirstLogin || !user.salt || !user.hash) {
        throw new BadRequestException('account-is-not-active');
      }
      const rawPassword = `${user.salt}.${loginDto.password}`;

      const isPasswordCorrect = await compare(rawPassword, user.hash);
      if (!isPasswordCorrect) {
        this.logger.error("Invalid user's password");
        throw new BadRequestException('invalid-password');
      }

      const currentDate = new Date();
      const expiredAt = new Date(
        currentDate.getTime() + jwt.jwtLifetimeRefreshToken * 1000,
      );
      const payload = {
        userId: user._id,
        status: user.isActive,
        expiredAt: expiredAt,
      };

      const { accessToken, refreshToken } = await this.signToken(payload);

      const userLogin = new UserLoginModel();
      userLogin._id = new ObjectId();
      userLogin.userId = user._id;
      userLogin.token = refreshToken; //save refresh token
      userLogin.ttl = expiredAt;

      await db
        .collection(NormalCollection.USER_LOGIN)
        .insertOne(userLogin, { session });

      const response = new LoginResponse();
      response.token = accessToken;
      response.refreshToken = refreshToken;
      response.id = user._id.toString();
      response.email = user.email;
      response.role = user.role;

      await session.commitTransaction();
      return response;
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      await session.abortTransaction();
      throw new BadRequestException(error);
    } finally {
      await session.endSession();
    }
  }

  public async logout(token: string): Promise<boolean> {
    const session = this.client.startSession();

    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      if (!token) {
        throw new BadGatewayException();
      }

      const userLogin: UserLoginModel = (await db
        .collection(NormalCollection.USER_LOGIN)
        .findOne({
          token,
        })) as UserLoginModel;
      if (!userLogin) {
        throw new BadRequestException('Token not found');
      }

      const userLoginResult = await db
        .collection(NormalCollection.USER_LOGIN)
        .deleteOne({ token }, { session });

      await session.commitTransaction();
      return userLoginResult.acknowledged && userLoginResult.deletedCount > 0;
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      await session.abortTransaction();
      throw new BadRequestException(error);
    } finally {
      await session.endSession();
    }
  }

  public async forgotPassword(
    forgotPasswordDto: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponse> {
    const session = this.client.startSession();
    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      const { email } = forgotPasswordDto;
      const user: UserModel = await this.userService.findUser(
        { email },
        session,
      );

      if (!user.isActive)
        throw new BadRequestException(
          'Your account is currently inactive. Please contact customer support for assistance in reactivating your account.',
        );

      const currentDate = new Date();
      const jwt = this.cfg.getOrThrow<JwtConfiguration>('jwt');
      const token = await this.jwtService.generateToken(
        {
          userId: user._id,
          status: user.isActive,
          expiredAt: new Date(currentDate.getTime() + 15 * 60 * 1000), //expire 15 minutes
        },
        jwt.jwtLifetimeForgotPassword,
      );

      const app = this.cfg.getOrThrow<AppConfiguration>('app');
      const mailer = this.cfg.getOrThrow<MailerConfiguration>('mailer');
      const createNewPasswordLink = `${app.url}/change-password?token=${token}`;
      const options: SendMailOptions = {
        to: email,
        from: mailer.mailerSendFrom,
        subject: 'Password Reset Request',
        template: 'reset-password.ejs',
        context: {
          firstName: user.firstName,
          createNewPasswordLink,
          emailSupport: mailer.emailSupport,
        },
      };
      const res = await this.emailService.sendMail(options);
      if (!res) {
        throw new BadRequestException('send-mail-fail');
      }

      await db.collection(NormalCollection.USER_LOGIN).deleteMany(
        {
          userId: user._id,
        },
        { session },
      );

      await session.commitTransaction();
      return { msg: 'send-mail-success' };
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      await session.abortTransaction();
      throw new BadRequestException(error);
    } finally {
      await session.endSession();
    }
  }

  public isExpiredToken(date: Date): boolean {
    if (new Date(date).getTime() > new Date().getTime()) return false;
    return true;
  }

  public async createNewPassword(
    createNewPasswordDTO: CreateNewPasswordDTO,
  ): Promise<CreateNewPasswordResponse> {
    const session = this.client.startSession();

    try {
      const db = this.client.db(this.cfg.getOrThrow('database').dbName);
      session.startTransaction();

      const { token, newPassword } = createNewPasswordDTO;
      let user: UserModel;
      let tobeUpdated = {};
      const decodeToken: AuthTokenInfo = (await this.jwtService.decodeToken(
        token,
      )) as AuthTokenInfo;

      console.log(decodeToken);
      if (!decodeToken || this.isExpiredToken(decodeToken.expiredAt)) {
        throw new BadRequestException('Expired token');
      }

      user = await this.userService.findUser(
        {
          _id: new ObjectId(decodeToken.userId),
        },
        session,
      );

      const newSalt = await genSalt(CREATE_USER_DEFAULT.SALT_HASH);
      const newHash = await hash(`${newSalt}.${newPassword}`, newSalt);

      tobeUpdated['salt'] = newSalt;
      tobeUpdated['hash'] = newHash;

      const updateUserResult = await db
        .collection(NormalCollection.USER)
        .updateOne({ _id: user._id }, { $set: tobeUpdated }, { session });

      await this.userLoginCollection.deleteMany(
        {
          user_id: user._id,
        },
        { session },
      );

      if (
        !updateUserResult.acknowledged ||
        updateUserResult.modifiedCount == 0
      ) {
        throw new BadRequestException('reset-new-password-fail');
      }

      await session.commitTransaction();
      return { msg: 'reset-new-password-success' };
    } catch (error) {
      this.logger.error(error.message, error.stack, AuthenticationService.name);
      await session.abortTransaction();
      throw new BadRequestException(error);
    } finally {
      await session.endSession();
    }
  }
}
