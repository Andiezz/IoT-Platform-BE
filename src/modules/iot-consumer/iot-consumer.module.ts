import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IotMessageProcessor } from './iot-consumer.service';
import { ThingModule } from '../thing/thing.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ConfigModule, ThingModule, NotificationModule],
  providers: [IotMessageProcessor],
  exports: [IotMessageProcessor],
})
export class IotConsumerModule {}
