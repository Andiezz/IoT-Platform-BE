import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ObjectId } from 'mongodb';

export class UpdateNotificationDto {
  @ApiProperty()
  public all: boolean;

  @ApiProperty()
  @Transform(({ value }) => value?.map((v: string) => new ObjectId(v)))
  public notificationIds: ObjectId[];
}
