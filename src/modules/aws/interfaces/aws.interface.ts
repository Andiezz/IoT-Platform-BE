import { ModuleMetadata } from '@nestjs/common';

export interface AWSConfigurationOptions{
  accessKey: string;
  accessSecret: string;
  awsAccountId?: string;
  awsRegion: string;
  bucket: string;
  useGlobalCredential: boolean;
  awsRootCaUrl: string;
  thingPolicy:string;
}


export interface AwsAsyncConfigurationOption extends Pick<ModuleMetadata, 'imports'>{
  useFactory?: (...args: unknown[]) => Promise<AWSConfigurationOptions> | AWSConfigurationOptions;
  inject?: any[];
}