import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';
import { PARAMETER_THRESHOLD_NAME } from 'src/modules/thing/thing.constant';
import { Threshold } from 'src/shared/models/parameter-standard.model';

export class ThresholdDto {
  @ApiProperty({ enum: Object.values(PARAMETER_THRESHOLD_NAME) })
  @IsNotEmpty()
  public name: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public color: string;

  @ApiProperty()
  @IsNotEmpty()
  public min: number;

  @ApiProperty()
  @IsNotEmpty()
  public max: number;
}

export class CreateParameterStandardDto {
  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public name: string;

  @ApiProperty()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim())
  public unit: string;

  @ApiProperty()
  @IsNotEmpty()
  public weight: number;

  @ApiProperty({ type: ThresholdDto })
  @IsNotEmpty()
  public thresholds: Threshold[];
}
