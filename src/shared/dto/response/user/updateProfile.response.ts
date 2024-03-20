import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileResponse {
  @ApiProperty()
  public msg: string;
}