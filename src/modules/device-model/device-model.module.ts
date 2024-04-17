import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { DeviceModelService } from './device-model.service';

@Module({
  imports: [
    MongoModule.forFeature([
      NormalCollection.DEVICE_MODEL,
      NormalCollection.PARAMETER_STANDARD,
    ]),
  ],
  controllers: [],
  providers: [DeviceModelService],
  exports: [DeviceModelService],
})
export class DeviceModelModule {}
