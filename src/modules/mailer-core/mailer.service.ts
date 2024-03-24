import { Inject, Injectable } from '@nestjs/common';
import { SentMessageInfo, Transporter, createTransport } from 'nodemailer';
import { EngineContext, MailerTemplateEngine } from './interfaces/template-engine.interface';
import { MailerOptions } from './interfaces/mailer-options.interface';
import { MailDataOptions } from './interfaces/mail.interface';
import { MAILER_OPTIONS } from './mailer.constants';

@Injectable()
export class MailerService {
  private transporter!: Transporter;

  private templateEngine: MailerTemplateEngine;

  constructor(
    @Inject(MAILER_OPTIONS)
    private readonly mailOptions: MailerOptions
    ) {
    if (this.mailOptions.template) {
      this.templateEngine = this.mailOptions.template.engine;
    }
    this.transporter = createTransport({
      ...(this.mailOptions.options || {}),
    });
  }

  public async send(options: MailDataOptions): Promise<SentMessageInfo> {
    if (options.template) {
      const html = await this.templateEngine.compile({
        path: options.template,
        options: {},
        context: options.context as EngineContext,
      });
      options.html = html;
    }

    delete options.template;
    delete options.context;
    return await this.transporter.sendMail(options);
  }
}
