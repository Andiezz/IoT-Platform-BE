import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountResponse {
  @ApiProperty()
  public _id: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public firstName: string;

  @ApiProperty()
  public lastName: string;
}