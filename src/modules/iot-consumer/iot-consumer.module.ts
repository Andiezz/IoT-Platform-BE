import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IotMessageProcessor } from './iot-consumer.service';

@Module({
  imports: [ConfigModule],
  providers: [IotMessageProcessor],
  exports: [IotMessageProcessor],
})
export class IotConsumerModule {}
