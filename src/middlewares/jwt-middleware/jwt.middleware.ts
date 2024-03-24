import {
  BadRequestException,
  Injectable,
  Logger,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { Collection, ObjectId } from 'mongodb';
import { InjectCollection } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from 'src/modules/jwt/jwt.service';
import { AuthTokenInfo } from 'src/modules/jwt/interfaces';

@Injectable()
export class JwtAuthenticationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtAuthenticationMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectCollection(NormalCollection.USER)
    private readonly userCollection: Collection,
  ) {}

  async use(req: Request, _: Response, next: NextFunction) {
    const header = req.headers['authorization'] || '';
    const token = header.split(' ')[1];
    const maybeError = new UnauthorizedException();
    if (!header || !token) {
      return next(maybeError);
    }

    try {
      const rs = await this.jwtService.verifyToken(token);
      if (!rs) {
        return next(maybeError);
      }
    } catch (error) {
      this.logger.error(error);
      return next(maybeError);
    }

    const decodeToken = (await this.jwtService.decodeToken(
      token,
    )) as AuthTokenInfo;

    const user = await this.userCollection
      .aggregate([
        {
          $match: {
            _id: new ObjectId(decodeToken.userId),
          },
        },
        {
          $group: {
            _id: '$_id',
            email: { $first: '$email' },
            avatar: { $first: '$avatar' },
            firstName: { $first: '$firstName' },
            lastName: { $first: '$lastName' },
            role: { $first: '$role' },
            isActive: { $first: '$isActive' },
          },
        },
        {
          $project: {
            email: 1,
            avatar: 1,
            firstName: 1,
            lastName: 1,
            role: 1,
            isActive: 1,
          },
        },
      ])
      .toArray();

    if (!user[0].isActive)
      throw new BadRequestException(
        'Your account is currently inactive. Please contact customer support for assistance in reactivating your account.',
      );

    req['user'] = user[0];

    return next();
  }
}
