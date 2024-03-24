import { ApiProperty } from '@nestjs/swagger';

export class DefaultResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  createdOn: string;

  @ApiProperty()
  updatedOn: string;
}
