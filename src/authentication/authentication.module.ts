import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from 'src/modules/jwt/jwt.module';
import { MongoModule } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { AuthenticationService } from './authentication.service';
import { EmailModule } from 'src/modules/email-service/email.module';
import { UserModule } from 'src/modules/user/user.module';

@Module({
  imports: [
    JwtModule,
    ConfigModule,
    EmailModule,
    UserModule,
    MongoModule.forFeature([
      NormalCollection.USER,
      NormalCollection.USER_LOGIN,
    ]),
  ],
  providers: [AuthenticationService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
