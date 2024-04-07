import { Module, forwardRef } from '@nestjs/common';
import { MongoModule } from '../mongodb';
import { NormalCollection } from 'src/shared/constants/mongo.collection';
import { UserModule } from '../user/user.module';
import { NotificationService } from './notification.service';
import { NotificationController } from 'src/controllers/notification/notification.controller';

@Module({
  imports: [
    UserModule,
    MongoModule.forFeature([
      NormalCollection.USER,
      NormalCollection.NOTIFICATION,
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
