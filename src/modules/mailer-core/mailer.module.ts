import { Module, DynamicModule } from '@nestjs/common';
import { MailerCoreModule } from './mailer-core.module';
import {
  MailerAsyncOptions,
  MailerOptions,
} from './interfaces/mailer-options.interface';

@Module({})
export class MailerModule {
  public static forRoot(options: MailerOptions): DynamicModule {
    return {
      module: MailerModule,
      imports: [MailerCoreModule.forRoot(options)],
    };
  }

  public static forRootAsync(options: MailerAsyncOptions): DynamicModule {
    return {
      module: MailerModule,
      imports: [MailerCoreModule.forRootAsync(options)],
    };
  }
}
