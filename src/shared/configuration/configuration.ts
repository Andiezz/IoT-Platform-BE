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

export interface WeatherApiConfiguration {
  apiKey: string;
  apiSec: string;
  baseUrl: string;
  nameGetWeather: string;
}

export interface MailerConfiguration {
  host: string;
  port: number;
  enableSsl: boolean;
  user: string;
  pazzword: string;
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

export interface IotConsumerConfiguration {
  clientId: string;
  host: string;
  port: number;
  ca: string;
  privateKey: string;
  certKey: string;
  topics: string[]
}
export interface Configuration {
  port: number;
  jwt: JwtConfiguration;
  database: DBConfiguration;
  weather: WeatherApiConfiguration;
  mailer: MailerConfiguration;
  aws: AwsConfiguration;
  app: AppConfiguration;
  iotConsumer: IotConsumerConfiguration
}


const CERT_BEGIN = '-----BEGIN CERTIFICATE-----';
const CERT_END = '-----END CERTIFICATE-----';
const KEY_BEGIN = '-----BEGIN RSA PRIVATE KEY-----';
const KEY_END = '-----END RSA PRIVATE KEY-----';

export default (): Configuration => ({
  port: parseInt(process.env.PORT, 10) || 8888,
  jwt: {
    jwtLifetime: parseInt(process.env.TOKEN_LIFE_TIME, 10) || 15 * 60, // in second
    jwtLifetimeActivation: parseInt(process.env.TOKEN_LIFE_TIME_ACTIVATION, 10) || 3 * 60, // in second
    jwtLifetimeForgotPassword: parseInt(process.env.TOKEN_LIFE_TIME_FORGOT_PASSWORD, 10) || 15 * 60, // in second
    jwtLifetimeAccessToken: parseInt(process.env.TOKEN_LIFE_TIME_ACCESS_TOKEN, 10) || 10 * 60, // 10 minute
    jwtLifetimeRefreshToken: parseInt(process.env.TOKEN_LIFE_TIME_REFRESH_TOKEN, 10) || 24 * 60 * 60, // 1 day
    jwtSec: process.env.TOKEN_SEC || 'changeMe_please',
  },
  database: {
    dbName: process.env.DB_NAME || '',
    uri: process.env.DB_URI || '',
    dbUser: process.env.DB_USER || '',
    dbPazz: process.env.DB_PAZZ || '',
    enableMigration: !!process.env.ENABLE_MIGRATION || true,
    migrationCollection: 'migration_histories',
    seedFolder: 'db/seed',
    migrationFolder: 'db/migration',
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY,
    apiSec: process.env.WEATHER_API_SEC,
    baseUrl: process.env.WEATHER_BASE_URL,
    nameGetWeather: process.env.CRONJOB_NAME_GET_WEATHER
  },
  mailer: {
    host: process.env.MAILER_HOST,
    port: parseInt(process.env.MAILER_PORT, 10) || 587,
    enableSsl: process.env.MAILER_ENABLE_SSL == 'true' || false,
    user: process.env.MAILER_USER || '',
    pazzword: process.env.MAILER_PAZZ || '',
  },
  aws: {
    appId: process.env.AWS_APP_ID,
    appSecret: process.env.AWS_APP_SECRET,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET,
    useGlobalCredential: process.env.AWS_USE_GLOBAL_CREDENTIALS == 'true',
    awsRootCaUrl: process.env.AWS_USE_ROOT_CA_URL || 'https://www.amazontrust.com/repository/AmazonRootCA1.pem',
    thingPolicy: process.env.AWS_THING_POLICY_NAME || ''
  },
  app: {
    url: process.env.FRONT_BASE_URL || 'http://localhost:3000',
    cloudFrontUrl: process.env.CLOUD_FRONT_URL
  },
  iotConsumer: {
    clientId: process.env.IOT_CLIENT_ID || '',
    host: process.env.IOT_HOST || '',
    port: process.env.IOT_PORT ? Number(process.env.IOT_PORT) : 1883,
    ca: `${CERT_BEGIN}\n${process.env.IOT_CA}\n${CERT_END}`,
    privateKey: `${KEY_BEGIN}\n${process.env.IOT_PRIVATE_KEY}\n${KEY_END}`,
    certKey: `${CERT_BEGIN}\n${process.env.IOT_CERT_KEY}\n${CERT_END}`,
    topics: []
  }
});
