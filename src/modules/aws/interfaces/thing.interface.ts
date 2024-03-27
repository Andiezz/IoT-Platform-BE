export interface AwsThingCreationOptions {
  name: string;
  isActive: boolean;
  id?: string;
}

export interface AwsThingCreationResult {
  thingId?: string;
  thingName?: string;
  awsRootCaPem?: string;
  thingCertPem?: string;
  certArn: string;
  certId: string;
  keyPair: {
    privateKey: string;
    publicKey: string;
  };
}
