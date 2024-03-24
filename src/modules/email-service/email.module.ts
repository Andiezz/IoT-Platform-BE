import { Module } from '@nestjs/common';
import { MailerModule } from '../mailer-core/mailer.module';
import { EmailService } from './email.service';
import { MailerService } from '../mailer-core/mailer.service';

@Module({
  imports: [MailerModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
