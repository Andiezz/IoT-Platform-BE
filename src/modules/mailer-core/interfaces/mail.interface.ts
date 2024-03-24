import { SendMailOptions } from 'nodemailer';
import DKIM from 'nodemailer/lib/dkim';
import { Attachment } from 'nodemailer/lib/mailer';

export type TextEncoding = 'quoted-printable' | 'base64';
export type Headers =
  | { [key: string]: string | string[] | { prepared: boolean; value: string } }
  | Array<{ key: string; value: string }>;
export type Recipients = string | Address | Array<string | Address>;

export interface Address {
  name: string;
  address: string;
}

export interface AttachmentLikeObject {
  path: string;
}

export interface MailDataOptions extends SendMailOptions {
  to?: Recipients;
  cc?: Recipients;
  bcc?: Recipients;
  replyTo?: string | Address;
  inReplyTo?: string | Address;
  from?: string | Address;
  subject?: string;
  text?: string | Buffer | AttachmentLikeObject;
  html?: string | Buffer;
  sender?: string | Address;
  raw?: string | Buffer;
  textEncoding?: TextEncoding;
  references?: string | string[];
  encoding?: string;
  date?: Date | string;
  headers?: Headers;
  context?: Record<string, any>;
  transporterName?: string;
  template?: string;
  attachments?: Attachment[];
  dkim?: DKIM.Options;
}
