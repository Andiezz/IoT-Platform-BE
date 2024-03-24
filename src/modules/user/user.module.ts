import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';

@Module({
  imports: [MongoModule.forFeature([NormalCollection.USER])],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
