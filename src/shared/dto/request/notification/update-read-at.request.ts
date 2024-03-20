import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserNotificationDTO {
  @ApiProperty()
  public all: boolean;

  @ApiProperty()
  public notification_ids: string[];
}
