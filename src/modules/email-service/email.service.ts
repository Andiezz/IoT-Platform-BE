import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer-core/mailer.service';
import { UserModel } from 'src/shared/models/user.model';
import {
  SendMailOptions,
  SendMailOptionsForArrayRecipient,
} from '../email-service/interfaces';
import { AppConfiguration } from 'src/shared/configuration/configuration';

@Injectable()
export class EmailService {
  private readonly logger: Logger = new Logger(EmailService.name);

  constructor(
    private readonly cfg: ConfigService,
    private readonly coreService: MailerService,
  ) {}

  public async sendMail(sendMailDto: SendMailOptions): Promise<boolean> {
    try {
      const res = await this.coreService.send({
        to: sendMailDto.to,
        from: sendMailDto.from,
        subject: sendMailDto.subject,
        template: sendMailDto.template,
        context: {
          ...sendMailDto.context,
          emailAddressCompany: process.env.EMAIL_ADDRESS_COMPANY,
          phoneAddressCompany: process.env.PHONE_NUMBER_COMPANY,
        },
      });
      return !!res.messageId;
    } catch (e) {
      console.log(e);
      throw new Error('Sending mail failed');
    }
  }

  public async sendMailToArrayRecipient(
    optionsDto: SendMailOptionsForArrayRecipient,
  ): Promise<boolean> {
    try {
      const res = await this.coreService.send({
        to: optionsDto.to,
        from: optionsDto.from,
        subject: optionsDto.subject,
        template: optionsDto.template,
        context: optionsDto.context,
      });
      return !!res.messageId;
    } catch (e) {
      console.log(e);
      this.logger.error(e);
      throw new Error('Sending mail failed');
    }
  }

  public async sendActivationTokenMail(token: string, user: UserModel) {
    try {
      const app = this.cfg.getOrThrow<AppConfiguration>('app');
      const link = `${app.url}/change-password?token=${token}&isNew=true`;

      await this.coreService.send({
        to: user.email,
        from: 'adminbnk@gamil.com',
        subject: 'Activation code for Exro',
        template: 'activate_account.ejs',
        context: {
          link,
          user: {
            first_name: user.first_name,
            last_name: user.last_name,
            token,
          },
        },
      });
    } catch (e) {
      console.log(e);
    }

    return true;
  }
}
