import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CertificateFile {
  @ApiProperty()
  public file: Buffer;

  @ApiProperty()
  @IsString()
  public name: string;

  @ApiProperty()
  @IsString()
  public type: string;
}

export class CreateThingResponse {
  @ApiProperty()
  @IsString()
  public msg: string

  @ApiProperty()
  @IsString()
  public files?: Array<CertificateFile>

  @ApiProperty()
  @IsString()
  public id?: string
}
