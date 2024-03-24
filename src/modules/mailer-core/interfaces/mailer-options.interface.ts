import { Transport, TransportOptions } from 'nodemailer';
import * as SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as SMTPPool from 'nodemailer/lib/smtp-pool';
import * as SendmailTransport from 'nodemailer/lib/sendmail-transport';
import * as StreamTransport from 'nodemailer/lib/stream-transport';
import * as JSONTransport from 'nodemailer/lib/json-transport';
import * as SESTransport from 'nodemailer/lib/ses-transport';
import { MailerTemplateEngine } from './template-engine.interface';
import { Type } from '@nestjs/common/interfaces';

type Options =
  | SMTPTransport.Options
  | SMTPPool.Options
  | SendmailTransport.Options
  | StreamTransport.Options
  | JSONTransport.Options
  | SESTransport.Options
  | TransportOptions;

export type TransportType =
  | Options
  | SMTPTransport
  | SMTPPool
  | SendmailTransport
  | StreamTransport
  | JSONTransport
  | SESTransport
  | Transport
  | string;

export interface MailerOptions {
  template?: {
    dir?: string;
    engine?: MailerTemplateEngine
  };
  options?: any; // TODO need to define type here
}
export interface MailerOptionsFactory {
  createMailerOptions(): Promise<MailerOptions> | MailerOptions;
}
export interface MailerAsyncOptions {
  imports: any[];
  useExisting?: Type<MailerOptionsFactory>;
  useClass?: Type<MailerOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<MailerOptions> | MailerOptions;
  inject?: any[]
}
