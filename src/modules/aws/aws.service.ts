import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AWSConfigurationOptions,
  AwsThingCreationOptions,
  AwsThingCreationResult,
} from './interfaces';
import { AWS_CLIENT_OPTIONS } from './aws.constant';
import { IAM } from '@aws-sdk/client-iam';
import { CertificateStatus, IoT } from '@aws-sdk/client-iot';
import {
  GetObjectCommand,
  GetObjectRequest,
  PutObjectCommand,
  PutObjectRequest,
  S3,
} from '@aws-sdk/client-s3';
import { STS } from '@aws-sdk/client-sts';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Buffer } from 'buffer';
import { Readable } from 'stream';

@Injectable()
export class AwsService implements OnModuleInit {
  private readonly logger: Logger = new Logger(AwsService.name);
  private IAMClient: IAM;
  private s3Client: S3;
  private stsClient: STS;
  private iotClient: IoT;
  private accountId: string;
  private awsRootCa: string;

  constructor(
    @Inject(AWS_CLIENT_OPTIONS)
    private readonly options: AWSConfigurationOptions,
    private readonly httpClient: HttpService,
  ) {
    if (!this.options.awsRegion || !this.options.awsRootCaUrl) {
      throw new Error('Invalid configuration');
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.options.thingPolicy) {
      throw new Error('Please configuration the thing policy');
    }
    // TODO think about setting up this value from configuration instead of fetching it from aws every time up bootstrap.
    const response = await firstValueFrom(
      this.httpClient.get(this.options.awsRootCaUrl),
    );

    this.awsRootCa = response.data;

    const { awsRegion: region } = this.options;

    const credentials = this.options.useGlobalCredential
      ? undefined
      : {
          accessKeyId: this.options.accessKey,
          secretAccessKey: this.options.accessSecret,
        };

    const commonCfg = {
      region,
      credentials,
    };
    this.stsClient = new STS(commonCfg);
    const currentIdentity = await this.stsClient.getCallerIdentity({});

    this.accountId = currentIdentity.Account;

    this.IAMClient = new IAM(commonCfg);
    this.iotClient = new IoT(commonCfg);

    this.s3Client = new S3({
      region,
      credentials,
    });
  }

  public async createThingWithCert(
    thingOpt: AwsThingCreationOptions,
  ): Promise<AwsThingCreationResult> {
    this.logger.debug('Start create things with name: ', thingOpt.name);
    if (!thingOpt.name) {
      throw new Error('Thing name is required to process...');
    }

    // create an iot thing with policy attached
    const iotThing = await this.iotClient.createThing({
      thingName: thingOpt.name,
      attributePayload: {
        attributes: {
          thingId: thingOpt.name,
        },
        merge: false,
      },
    });
    this.logger.debug('Thing information', iotThing?.thingName);
    // create cert
    const thingCert = await this.iotClient.createKeysAndCertificate({
      setAsActive: thingOpt.isActive,
    });

    const certArn = `arn:aws:iot:${this.options.awsRegion}:${this.accountId}:cert/${thingCert.certificateId}`;

    //TODO consider upload cert to s3 or not.

    const thingCertPem = thingCert.certificatePem;

    await this.iotClient.attachPolicy({
      policyName: this.options.thingPolicy,
      target: certArn,
    });

    // attach policy to thing arn

    await this.iotClient.attachThingPrincipal({
      principal: certArn,
      thingName: iotThing.thingName,
    });

    return {
      thingId: iotThing.thingId,
      thingName: iotThing.thingName,
      awsRootCaPem: this.awsRootCa,
      thingCertPem,
      certId: thingCert.certificateId,
      certArn,
      keyPair: {
        privateKey: thingCert.keyPair.PrivateKey,
        publicKey: thingCert.keyPair.PublicKey,
      },
    };
  }

  public async deleteCert(
    certId: string,
    certArn: string,
    thingName: string,
  ): Promise<boolean> {
    try {
      await this.iotClient.updateCertificate({
        certificateId: certId,
        newStatus: CertificateStatus.INACTIVE,
      });

      await this.iotClient.detachPolicy({
        policyName: this.options.thingPolicy,
        target: certArn,
      });

      await this.iotClient.detachThingPrincipal({
        principal: certArn,
        thingName: thingName,
      });

      await this.iotClient.deleteCertificate({
        certificateId: certId,
        forceDelete: true,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  public async createCertificate(thingName: string) {
    // create cert
    const thingCert = await this.iotClient.createKeysAndCertificate({
      setAsActive: true,
    });

    const certArn = `arn:aws:iot:${this.options.awsRegion}:${this.accountId}:cert/${thingCert.certificateId}`;

    //TODO consider upload cert to s3 or not.

    const thingCertPem = thingCert.certificatePem;

    await this.iotClient.attachPolicy({
      policyName: this.options.thingPolicy,
      target: certArn,
    });

    // attach policy to thing arn
    await this.iotClient.attachThingPrincipal({
      principal: certArn,
      thingName: thingName,
    });

    return {
      awsRootCaPem: this.awsRootCa,
      thingCertPem,
      certId: thingCert.certificateId,
      certArn,
      keyPair: {
        privateKey: thingCert.keyPair.PrivateKey,
        publicKey: thingCert.keyPair.PublicKey,
      },
    };
  }

  public async changeThingCertStatus(
    certId: string,
    status: CertificateStatus,
  ): Promise<boolean> {
    await this.iotClient.updateCertificate({
      certificateId: certId,
      newStatus: status,
    });
    return true;
  }

  public async deleteThing(thingName: string): Promise<boolean> {
    await this.iotClient.deleteThing({
      thingName,
    });
    return true;
  }

  public async uploadFileToS3(
    key: string,
    fileBuffer: Buffer,
  ): Promise<boolean> {
    const params = {
      Bucket: this.options.bucket,
      Key: key,
      Body: fileBuffer,
    };
    const res = await this.s3Client.putObject(params);
    if (res.$metadata.httpStatusCode === 200) return true;
    return false;
  }

  public async streamFileToS3(
    key: string,
    fileStream: Readable,
  ): Promise<string> {
    const putFileRequest: PutObjectRequest = {
      Bucket: this.options.bucket,
      Key: key,
      Body: fileStream,
    };
    const command = new PutObjectCommand(putFileRequest);
    await this.s3Client.send(command);
    return key;
  }

  public async downloadFileFromS3(key: string): Promise<Buffer> {
    const getObjCmd: GetObjectRequest = {
      Bucket: this.options.bucket,
      Key: key,
    };

    const command = new GetObjectCommand(getObjCmd);
    const result = await this.s3Client.send(command);
    const data = await result.Body.transformToByteArray();
    return Buffer.from(data);
  }

  public async streamFileFromS3(
    key: string,
    outStream: WritableStream,
  ): Promise<void> {
    const getObjCmd: GetObjectRequest = {
      Bucket: this.options.bucket,
      Key: key,
    };
    const command = new GetObjectCommand(getObjCmd);
    const result = await this.s3Client.send(command);
    result.Body.transformToWebStream().pipeTo(outStream);
  }

  // put file to S3 and return job placeholder presigned url
  async putObjectS3(file: Express.Multer.File, Key: string): Promise<string> {
    const bucket = process.env.AWS_BUCKET_COMMAND || 'exro-job-templates';
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucket,
      Key,
      Body: file.buffer,
    });
    const s3Response = await this.s3Client.send(putObjectCommand);

    // TODO: check failed s3Response
    if (!s3Response) {
      throw new Error('Cannot upload file to S3');
    }

    return `\${aws:iot:s3-presigned-url:https://s3.region.amazonaws.com/${bucket}/${Key}}`;
  }
}
