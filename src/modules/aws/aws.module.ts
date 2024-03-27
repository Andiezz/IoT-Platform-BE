import { DynamicModule, Module } from '@nestjs/common';
import {
  AWSConfigurationOptions,
  AwsAsyncConfigurationOption,
} from './interfaces/';
import { AWSCoreModule } from './aws-core.module';

@Module({})
export class AwsModule {
  public static forRoot(options: AWSConfigurationOptions): DynamicModule {
    return {
      module: AwsModule,
      imports: [AWSCoreModule.forRoot(options)],
    };
  }

  public static forAsyncRoot(
    options: AwsAsyncConfigurationOption,
  ): DynamicModule {
    return {
      module: AwsModule,
      imports: [AWSCoreModule.forRootAsync(options)],
    };
  }
}
