import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordResponse {
  @ApiProperty()
  public msg: string;
}