import {
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { IIotMessageProcessor } from './iot-consumer.interface';
import { ConfigService } from '@nestjs/config';
import { IotConsumerConfiguration } from 'src/shared/configuration/configuration';
import * as mqtt from 'mqtt';

@Injectable()
export class IotMessageProcessor
  implements IIotMessageProcessor, OnApplicationShutdown
{
  private readonly logger: Logger = new Logger(IotMessageProcessor.name);

  private iotClient?: mqtt.MqttClient;

  constructor(
    private readonly cfg: ConfigService,
  ) {
    this.initClient();
  }
  public onApplicationShutdown() {
    this.iotClient?.end();
  }

  private initClient(): void {
    this.logger.log('start setting up the data for consumer');
    const iotCfg: IotConsumerConfiguration = this.cfg.getOrThrow('iotConsumer');
    this.iotClient = mqtt.connect({
      clientId: iotCfg.clientId,
      host: iotCfg.host,
      protocol: 'mqtt',
      ca: iotCfg.ca,
      key: iotCfg.privateKey,
      cert: iotCfg.certKey,
    });

    this.subscribe();
  }

  public publish(topic: string, message: string) {
    this.iotClient.publish(topic, message);
  }

  private subscribe() {
    this.logger.debug('subscribe to topic');
    if (!this.iotClient) {
      return;
    }

    this.iotClient.on('connect', () => {
      this.logger.debug('Consumer connected to iot core');

      this.iotClient.subscribe('$aws/events/presence/connected/#', (e) => {
        this.logError(e);
      });
      this.iotClient.subscribe('$aws/events/presence/disconnected/#', (e) => {
        this.logError(e);
      });
    });

    this.iotClient.on('message', async (topic: string, message: Buffer) => {
      await this.process(topic, message);
    });
  }

  logError(e: Error) {
    if (e) {
      this.logger.error(e);
    }
  }

  public async process(topic: string, message: Buffer): Promise<void> {
    if (
      topic.includes('presence/connected') ||
      topic.includes('presence/disconnected')
    ) {
    }
  }
}
