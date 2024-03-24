import { SendMailOptions as SendMailOptionsOrigin } from "nodemailer";

export interface SendMailOptions {
  to: string;
  from: string;
  subject: string;
  template: string;
  context: {
    [key: string]: {
      [key: string]: string
    } | string;
  }
}

export interface SendMailOptionsForArrayRecipient extends SendMailOptionsOrigin {
  template: string;
  context: {
    [key: string]: {
      [key: string]: string
    } | string;
  }
}