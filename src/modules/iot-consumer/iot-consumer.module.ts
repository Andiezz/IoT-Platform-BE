import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IotMessageProcessor } from './iot-consumer.service';
import { ThingModule } from '../thing/thing.module';

@Module({
  imports: [ConfigModule, ThingModule],
  providers: [IotMessageProcessor],
  exports: [IotMessageProcessor],
})
export class IotConsumerModule {}
