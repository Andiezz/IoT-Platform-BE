import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { ObjectId } from 'mongodb';

export class CreateDeviceModelDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public information: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public type: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string[] }) =>
    value.map((v) => new ObjectId(v)),
  )
  public parameterStandards: ObjectId[];
}
