import { Module } from '@nestjs/common';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserModule } from '../user/user.module';
import { ThingService } from './thing.service';

@Module({
  imports: [
    MongoModule.forFeature([NormalCollection.THING, NormalCollection.DEVICE]),
    UserModule,
  ],
  providers: [ThingService],
  exports: [ThingService],
})
export class ThingModule {}
