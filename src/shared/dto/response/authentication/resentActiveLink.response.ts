import { ApiProperty } from '@nestjs/swagger';

export class ResentActiveLinkResponse {
  @ApiProperty()
  public msg: string;
}