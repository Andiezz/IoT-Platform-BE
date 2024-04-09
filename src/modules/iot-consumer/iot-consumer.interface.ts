export interface IIotMessageProcessor {
  process(topic: string, message: Buffer): void | Promise<void>;
}

export const MQTT_TOPIC = {
  realTimeData: 'thing/+/publish-data',
};

export type IotEventTypeStatus = 'disconnected' | 'connected';

export interface DeviceStatusMessage {
  clientId: string;
  timestamp: number;
  eventType: IotEventTypeStatus;
  clientInitiatedDisconnect: boolean;
  sessionIdentifier: string;
  principalIdentifier: string;
  versionNumber: number;
}

export interface ThingData {
  pm25: number;
  temperature: number;
  humidity: number;
  lpg: number;
  ch4: number;
  co: number;
  alcohol: number;
  co2: number;
  toluen: number;
  nh4: number;
  aceton: number;
}

export type MqttPayload = DeviceStatusMessage | ThingData;
