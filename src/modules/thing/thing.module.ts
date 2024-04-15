import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserModule } from '../user/user.module';
import { ThingService } from './thing.service';
import { DeviceModelModule } from '../device-model/device-model.module';

@Module({
  imports: [
    MongoModule.forFeature([NormalCollection.THING]),
    UserModule,
    DeviceModelModule,
  ],
  providers: [ThingService],
  exports: [ThingService],
})
export class ThingModule {}
