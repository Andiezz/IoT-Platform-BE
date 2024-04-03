import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class SaveThingResponse {
  @ApiProperty()
  @IsString()
  public msg: string

  @ApiPropertyOptional()
  @IsString()
  public files?: Array<CertificateFile>

  @ApiPropertyOptional()
  @IsString()
  public id?: string
}
