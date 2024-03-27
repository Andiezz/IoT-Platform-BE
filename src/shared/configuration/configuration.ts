export interface DBConfiguration {
  dbName: string;
  uri: string;
  dbUser: string;
  dbPazz: string;
  enableMigration: boolean;
  migrationCollection?: string;
  seedFolder?: string;
  migrationFolder?: string;
}

export interface MailerConfiguration {
  host: string;
  port: number;
  enableSsl: boolean;
  user: string;
  pazzword: string;
  mailerSendFrom: string;
  emailSupport: string;
}

export interface JwtConfiguration {
  jwtLifetime: number;
  jwtLifetimeActivation: number;
  jwtLifetimeForgotPassword: number;
  jwtLifetimeAccessToken: number;
  jwtLifetimeRefreshToken: number;
  jwtSec: string;
}

export interface AwsConfiguration {
  appId: string;
  appSecret: string;
  region: string;
  bucket: string;
  useGlobalCredential: boolean;
  awsRootCaUrl: string;
  thingPolicy: string;
}

export interface AppConfiguration {
  url: string;
  cloudFrontUrl: string;
}

export interface Configuration {
  port: number;
  jwt: JwtConfiguration;
  database: DBConfiguration;
  mailer: MailerConfiguration;
  app: AppConfiguration;
}

export default (): Configuration => ({
  port: parseInt(process.env.PORT, 10) || 8888,
  jwt: {
    jwtLifetime: parseInt(process.env.TOKEN_LIFE_TIME, 10) || 15 * 60, // in second
    jwtLifetimeActivation:
      parseInt(process.env.TOKEN_LIFE_TIME_ACTIVATION, 10) || 3 * 60, // in second
    jwtLifetimeForgotPassword:
      parseInt(process.env.TOKEN_LIFE_TIME_FORGOT_PASSWORD, 10) || 15 * 60, // in second
    jwtLifetimeAccessToken:
      parseInt(process.env.TOKEN_LIFE_TIME_ACCESS_TOKEN, 10) || 10 * 60, // 10 minute
    jwtLifetimeRefreshToken:
      parseInt(process.env.TOKEN_LIFE_TIME_REFRESH_TOKEN, 10) || 24 * 60 * 60, // 1 day
    jwtSec: process.env.TOKEN_SEC || 'changeMe_please',
  },
  database: {
    dbName: process.env.DB_NAME || '',
    uri: process.env.DB_URI || '',
    dbUser: process.env.DB_USER || '',
    dbPazz: process.env.DB_PAZZ || '',
    enableMigration: !!process.env.ENABLE_MIGRATION || true,
    migrationCollection: 'migrationHistories',
    seedFolder: 'db/seed',
    migrationFolder: 'db/migration',
  },
  mailer: {
    host: process.env.MAILER_HOST,
    port: parseInt(process.env.MAILER_PORT, 10) || 587,
    enableSsl: process.env.MAILER_ENABLE_SSL == 'true' || false,
    user: process.env.MAILER_USER || '',
    pazzword: process.env.MAILER_PAZZ || '',
    mailerSendFrom: process.env.MAILER_SEND_FROM,
    emailSupport: process.env.MAILER_EMAIL_SUPPORT,
  },
  app: {
    url: process.env.FRONT_BASE_URL || 'http://localhost:3000',
    cloudFrontUrl: process.env.CLOUD_FRONT_URL,
  },
});
