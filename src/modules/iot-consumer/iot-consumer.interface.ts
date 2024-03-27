export interface IIotMessageProcessor {
  process(topic: string, message: Buffer): void | Promise<void>;
}
