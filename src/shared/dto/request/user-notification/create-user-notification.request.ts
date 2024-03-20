import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ObjectId } from 'mongodb';

export class CreateUserNotificationDTO {
  @ApiProperty()
  @IsString()
  public all: boolean;

  @ApiProperty()
  @IsString()
  public user_id: ObjectId;

  @ApiProperty()
  @IsString()
  public notification_id: string;

  @ApiProperty()
  @IsString()
  public read_at: boolean;
}
