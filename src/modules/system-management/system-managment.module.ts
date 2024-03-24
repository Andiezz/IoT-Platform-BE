import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoModule } from 'src/modules/mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { SystemManagementController } from 'src/controllers/system-management/system-management.controller';
import { SystemManagementService } from './system-management.service';
import { EmailModule } from '../email-service/email.module';
import { JwtModule } from '../jwt/jwt.module';
import { AuthenticationModule } from 'src/authentication/authentication.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    ConfigModule,
    MongoModule.forFeature([NormalCollection.USER]),
    EmailModule,
    JwtModule,
    AuthenticationModule,
    UserModule,
  ],
  controllers: [SystemManagementController],
  providers: [SystemManagementService],
  exports: [SystemManagementService],
})
export class SystemManagementModule {}
