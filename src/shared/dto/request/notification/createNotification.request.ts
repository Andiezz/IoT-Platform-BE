import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { CreateUserNotificationDTO } from '../user-notification/create-user-notification.request';

export class CreateNotificationDTO {
  @ApiProperty()
  @IsString()
  public title: string;

  @ApiProperty()
  @IsString()
  public description: object;

  @ApiProperty()
  @IsString()
  public type: string;

  @ApiProperty()
  @IsNotEmpty()
  public info: object;

  @ApiProperty()
  @IsNotEmpty()
  public userNotification: CreateUserNotificationDTO;
}
