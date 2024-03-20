import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountResponse {
  @ApiProperty()
  public _id: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public first_name: string;

  @ApiProperty()
  public last_name: string;
}