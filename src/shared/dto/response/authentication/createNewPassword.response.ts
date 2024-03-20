import { ApiProperty } from '@nestjs/swagger';

export class CreateNewPasswordResponse {
  @ApiProperty()
  public msg: string;
}