import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IotMessageProcessor } from './iot-consumer.service';
import { ThingModule } from '../thing/thing.module';
import { NotificationModule } from '../notification/notification.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [ConfigModule, ThingModule, NotificationModule, SocketModule],
  providers: [IotMessageProcessor],
  exports: [IotMessageProcessor],
})
export class IotConsumerModule {}
