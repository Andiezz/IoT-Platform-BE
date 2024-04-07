import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  DeviceStatusMessage,
  IIotMessageProcessor,
} from './iot-consumer.interface';
import { ConfigService } from '@nestjs/config';
import { IotConsumerConfiguration } from 'src/shared/configuration/configuration';
import * as mqtt from 'mqtt';
import { ThingService } from '../thing/thing.service';
import { ObjectId } from 'mongodb';

@Injectable()
export class IotMessageProcessor
  implements IIotMessageProcessor, OnApplicationShutdown
{
  private readonly logger: Logger = new Logger(IotMessageProcessor.name);

  private iotClient?: mqtt.MqttClient;

  constructor(
    private readonly cfg: ConfigService,
    private readonly thingService: ThingService,
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

  private async processThingStatusMessage(
    message: DeviceStatusMessage,
  ): Promise<void> {
    if (message.eventType === 'connected') {
      await this.thingService.updateStatusActive(
        new ObjectId(message.clientId),
      );
    } else if (message.eventType === 'disconnected') {
      await this.thingService.updateStatusInactive(
        new ObjectId(message.clientId),
      );
    }
  }

  public async process(topic: string, message: Buffer): Promise<void> {
    const iotCfg: IotConsumerConfiguration = this.cfg.getOrThrow('iotConsumer');
    const jsonMessage: DeviceStatusMessage = JSON.parse(
      message.toLocaleString(),
    );
    // skip messages from this client
    if (jsonMessage.clientId !== iotCfg.clientId) {
      return;
    }

    if (
      topic.includes('presence/connected') ||
      topic.includes('presence/disconnected')
    ) {
      await this.processThingStatusMessage(jsonMessage);
    } else if (/^thing\/([a-z0-9]+)\/real_time_data$/.test(topic)) {
      //TODO:
      // process real time data, publish socket
      // 1. update device status
      // 2. trigger notification warning
    }
  }
}
