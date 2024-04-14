import { Module, forwardRef } from '@nestjs/common';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserModule } from '../user/user.module';
import { NotificationService } from './notification.service';
import { ThingModule } from '../thing/thing.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [
    UserModule,
    ThingModule,
    MongoModule.forFeature([
      NormalCollection.USER,
      NormalCollection.NOTIFICATION,
    ]),
    SocketModule,
  ],
  controllers: [],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
