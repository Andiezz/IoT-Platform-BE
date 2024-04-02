import { Module } from '@nestjs/common';
import { RequestContextModule } from './modules/request-context';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration, {
  AwsConfiguration,
  DBConfiguration,
  MailerConfiguration,
} from './shared/configuration/configuration';
import { MongoModule } from './modules/mongodb';
import controllers from './controllers';
import { JwtAuthenticationModule } from './middlewares/jwt-middleware/jwt.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseTransformer } from './shared/interceptors/response-tranformer.interceptor';
import { SystemManagementModule } from './modules/system-management/system-managment.module';
import { UserManagementModule } from './modules/user-management/user-management.module';
import { UserModule } from './modules/user/user.module';
import validations from './shared/validations/index.validations';
import { GlobalExceptionFilter } from './shared/filter/global-exception.filter';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';
import { MailerModule } from './modules/mailer-core/mailer.module';
import { EjsEngine } from './modules/mailer-core/template-engine/Ejs.engine';
import { join } from 'path';
import { ValidationModule } from './modules/validation/validation.module';
import { ThingModule } from './modules/thing/thing.module';
import { AwsModule } from './modules/aws';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    RequestContextModule,
    JwtAuthenticationModule,
    AuthenticationModule,
    SystemManagementModule,
    UserManagementModule,
    UserModule,
    ThingModule,
    ValidationModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local'],
      ignoreEnvFile: process.env.NODE_ENV == 'local',
      load: [configuration],
    }),
    WinstonModule.forRoot({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('Nest', {
          colors: true,
          prettyPrint: true,
        }),
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('Nest', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),
      ],
    }),
    MongoModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const dbOptions = cfg.getOrThrow<DBConfiguration>('database');
        return {
          uri: dbOptions.uri,
          dbName: dbOptions.dbName,
          migration: {
            enabled: dbOptions.enableMigration,
            collectionName: dbOptions.migrationCollection,
            dir: dbOptions.migrationFolder,
            seed: dbOptions.seedFolder,
          },
        };
      },
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => {
        const mailOpt = cfg.getOrThrow<MailerConfiguration>('mailer');
        return {
          template: {
            dir: __dirname,
            engine: new EjsEngine({
              baseDir: join(__dirname, 'resources', 'template', 'mail'),
            }),
          },
          options: {
            pool: true,
            host: mailOpt.host,
            port: mailOpt.port,
            secure: mailOpt.enableSsl,
            secureConnection: false,
            auth: {
              user: mailOpt.user,
              pass: mailOpt.pazzword,
            },
            tls: {
              rejectUnauthorized: false,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    AwsModule.forAsyncRoot({
      imports: [ConfigModule, HttpModule.register({})],
      useFactory: (cfg: ConfigService) => {
        const awsOption = cfg.getOrThrow<AwsConfiguration>('aws');
        return {
          accessKey: awsOption.appId,
          accessSecret: awsOption.appSecret,
          awsRegion: awsOption.region,
          bucket: awsOption.bucket,
          useGlobalCredential: awsOption.useGlobalCredential,
          awsRootCaUrl: awsOption.awsRootCaUrl,
          thingPolicy: awsOption.thingPolicy,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [...controllers],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformer,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    ...validations,
  ],
})
export class AppModule {}
