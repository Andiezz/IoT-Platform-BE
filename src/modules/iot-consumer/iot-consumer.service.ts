import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import {
  DeviceStatusMessage,
  IIotMessageProcessor,
  MqttPayload,
  ThingData,
} from './iot-consumer.interface';
import { ConfigService } from '@nestjs/config';
import { IotConsumerConfiguration } from 'src/shared/configuration/configuration';
import * as mqtt from 'mqtt';
import { ThingService } from '../thing/thing.service';
import { ObjectId } from 'mongodb';
import { NotificationService } from '../notification/notification.service';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class IotMessageProcessor
  implements IIotMessageProcessor, OnApplicationShutdown
{
  private readonly logger: Logger = new Logger(IotMessageProcessor.name);

  private iotClient?: mqtt.MqttClient;

  constructor(
    private readonly cfg: ConfigService,
    private readonly thingService: ThingService,
    private readonly notificationService: NotificationService,
    private readonly socketGateway: SocketGateway,
  ) {
    this.initClient();
  }
  public onApplicationShutdown() {
    this.iotClient?.end();
  }

  private initClient(): void {
    this.logger.log('Start setting up the data for consumer');
    const iotCfg: IotConsumerConfiguration = this.cfg.getOrThrow('iotConsumer');
    this.iotClient = mqtt.connect({
      clientId: iotCfg.clientId,
      host: iotCfg.host,
      protocol: 'mqtt',
      ca: iotCfg.ca,
      key: iotCfg.privateKey,
      cert: iotCfg.certKey,
      reconnectPeriod: 0,
      clean: true,
      protocolVersion: 5,
    });

    this.subscribe();
  }

  public publish(topic: string, message: string) {
    this.iotClient.publish(topic, message);
  }

  private subscribe() {
    this.logger.debug('Subscribe to topic');
    if (!this.iotClient) {
      this.logger.debug('IoT Client null');
      return;
    }

    this.iotClient.on('connect', () => {
      this.logger.log('Consumer connected to iot core');

      this.iotClient.subscribe('presence/connected/#', (e) => {
        this.logError(e);
      });
      this.iotClient.subscribe('$aws/events/presence/disconnected/#', (e) => {
        this.logError(e);
      });

      this.iotClient.subscribe('thing/+/real_time_data', (e) => {
        this.logError(e);
      });
    });

    this.iotClient.on('message', async (topic: string, message: Buffer) => {
      this.logger.log(`Received data on ${topic}: ${message.toString()}`);
      await this.process(topic, message);
    });

    this.iotClient.on('error', (error) => {
      this.logger.error('Error when connecting to the client: ', error);
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
    const thingId = message.clientId.padEnd(24).slice(-24);
    if (message.eventType === 'connected') {
      await this.thingService.updateStatusActive(new ObjectId(thingId));
    } else if (message.eventType === 'disconnected') {
      await this.thingService.updateStatusInactive(new ObjectId(thingId));
    }
  }

  private async processTriggerNotification(
    thingId: ObjectId,
    message: ThingData,
  ) {
    // check which notification type
    const createNotificationDtos =
      await this.notificationService.classifyTypeAndTitle(thingId, message);

    // create notifiaction and publish socket
    await this.notificationService.createExceedThresholdNotification(
      thingId,
      createNotificationDtos,
    );
  }

  public async process(topic: string, message: Buffer): Promise<void> {
    const iotCfg: IotConsumerConfiguration = this.cfg.getOrThrow('iotConsumer');
    const jsonMessage: MqttPayload = JSON.parse(message.toLocaleString());

    if (
      topic.includes('presence/connected') ||
      topic.includes('presence/disconnected')
    ) {
      const deviceStatusMsg: DeviceStatusMessage =
        jsonMessage as DeviceStatusMessage;
      // skip messages from this client
      if (deviceStatusMsg.clientId === iotCfg.clientId) {
        return;
      }
      this.logger.log(
        'Process thing status message ',
        deviceStatusMsg.clientId,
      );
      //TODO:
      // 1. publish connected message
      await this.socketGateway.publish(
        `/thing-status/${deviceStatusMsg.clientId}`,
        {
          channel: 'thing-status-process',
          data: deviceStatusMsg.eventType,
        },
      );

      // 2. change status db
      await this.processThingStatusMessage(deviceStatusMsg);
    } else if (/^thing\/([a-z0-9]+)\/real_time_data$/.test(topic)) {
      const thingData: ThingData = jsonMessage as ThingData;
      // extract thing id from topic
      const params = topic.split('/');
      this.logger.log('Process real time data thing ', params[1]);

      // 1. trigger notification
      await this.processTriggerNotification(new ObjectId(params[1]), thingData);

      //TODO:
      // 2. publish real time data socket
    }
  }
}
