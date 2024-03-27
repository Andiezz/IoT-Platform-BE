import { DynamicModule, Global, Module } from '@nestjs/common';
import {
  AWSConfigurationOptions,
  AwsAsyncConfigurationOption,
} from './interfaces/aws.interface';
import { AWS_CLIENT_OPTIONS } from './aws.constant';
import { AwsService } from './aws.service';

@Global()
@Module({})
export class AWSCoreModule {
  public static forRoot(options: AWSConfigurationOptions): DynamicModule {
    return {
      module: AWSCoreModule,
      providers: [
        {
          provide: AWS_CLIENT_OPTIONS,
          useValue: options,
        },
        AwsService,
      ],
      exports: [AwsService],
    };
  }

  public static forRootAsync(
    options: AwsAsyncConfigurationOption,
  ): DynamicModule {
    return {
      module: AWSCoreModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: AWS_CLIENT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        AwsService,
      ],
      exports: [AwsService],
    };
  }
}
