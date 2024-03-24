import { ApiProperty } from '@nestjs/swagger';
import { ROLE } from 'src/shared/models/user.model';

export class GetAccountResponse {
  @ApiProperty()
  public id: string;

  @ApiProperty()
  public firstName: string;

  @ApiProperty()
  public lastName: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public phoneCode: string;

  @ApiProperty()
  public phoneNumber: string;

  @ApiProperty()
  public isActive: boolean;

  @ApiProperty()
  public role?: ROLE;
}
