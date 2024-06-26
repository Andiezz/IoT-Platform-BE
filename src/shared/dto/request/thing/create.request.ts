import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
} from 'class-validator';
import { ObjectId } from 'mongodb';
import { DEVICE_STATUS } from 'src/shared/models/thing.model';
import { CreateParameterStandardDto } from '../parameter-standard/create.request';

export class ManagerThingDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value.trim())
  public email: string;
}

export class DeviceDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiPropertyOptional()
  public status: DEVICE_STATUS = DEVICE_STATUS.PENDING_SETUP;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => new ObjectId(value))
  public model: ObjectId;

  @ApiPropertyOptional({ type: [CreateParameterStandardDto] })
  public parameterStandards?: CreateParameterStandardDto[];

  @ApiPropertyOptional()
  parameterStandardDefault: boolean = true;
}

export class LocationDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public address: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsNotEmpty()
  public longitude: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsNotEmpty()
  public latitude: number;
}

export class ManagerDto {
  @ApiProperty()
  @IsNotEmpty()
  public userId: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  public isOwner: boolean;
}

export class SaveThingDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public information?: string;

  @ApiProperty({ type: LocationDto })
  @IsObject()
  @IsNotEmptyObject()
  @Type(() => LocationDto)
  public location: LocationDto;

  @ApiPropertyOptional()
  public status: DEVICE_STATUS = DEVICE_STATUS.PENDING_SETUP;

  @ApiProperty({ type: [ManagerDto] })
  @Type(() => ManagerDto)
  public managers: ManagerDto[];

  @ApiPropertyOptional({ type: [DeviceDto] })
  @Type(() => DeviceDto)
  devices: DeviceDto[];
}
