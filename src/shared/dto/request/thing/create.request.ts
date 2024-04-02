import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ObjectId } from 'mongodb';
import { DEVICE_STATUS } from 'src/shared/models/thing.model';

class ParameterStandardDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiProperty()
  @IsNotEmpty()
  public unit: string;

  @ApiPropertyOptional()
  public min?: number;

  @ApiPropertyOptional()
  public max?: number;
}

class DeviceDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiPropertyOptional()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public information?: string;

  @ApiPropertyOptional()
  public status: DEVICE_STATUS = DEVICE_STATUS.PENDING_SETUP;

  @ApiPropertyOptional()
  @Transform(({ value }: { value: string }) => value.trim())
  public type?: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public model: string;

  @ApiProperty({ type: [ParameterStandardDto] })
  @IsNotEmpty()
  public parameterStandards: ParameterStandardDto[];
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
  @Transform(({ value }: { value: string }) => new ObjectId(value))
  public userId: ObjectId;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  public isOwner: boolean;
}

export class CreateThingDto {
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
  @IsOptional()
  @Type(() => DeviceDto)
  devices?: DeviceDto[];
}
