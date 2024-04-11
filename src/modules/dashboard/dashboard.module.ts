import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { DashboardService } from './dashboard.service';
import { DashboardController } from 'src/controllers/dashboard/dashboard.controller';
import { UserModule } from '../user/user.module';
import { AwsModule } from '../aws';
import { ThingModule } from '../thing/thing.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    MongoModule.forFeature([NormalCollection.THING, NormalCollection.USER]),
    UserModule,
    AwsModule,
    ThingModule,
    NotificationModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
