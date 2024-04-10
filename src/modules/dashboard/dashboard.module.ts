import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { DashboardService } from './dashboard.service';
import { DashboardController } from 'src/controllers/dashboard/dashboard.controller';
import { UserModule } from '../user/user.module';
import { AwsModule } from '../aws';

@Module({
  imports: [
    ConfigModule,
    MongoModule.forFeature([NormalCollection.THING, NormalCollection.USER]),
    UserModule,
    AwsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
