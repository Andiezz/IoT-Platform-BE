import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserManagementController } from 'src/controllers/user-management/user-management.controller';
import { UserManagementService } from './user-management.service';
import { JwtModule } from '../jwt/jwt.module';
import { UserModule } from '../user/user.module';

@Module({
  imports:[
    ConfigModule,
    MongoModule.forFeature([NormalCollection.USER]),
    JwtModule,
    UserModule
  ],
  controllers: [UserManagementController],
  providers: [UserManagementService],
  exports: [UserManagementService]
})
export class UserManagementModule{}