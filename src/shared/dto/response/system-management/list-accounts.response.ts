import { ApiProperty } from '@nestjs/swagger';
import { ROLE } from 'src/shared/models/user.model';

class BaseResponse {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  createdOn: string;

  @ApiProperty()
  updatedOn: string;
}

class Role extends BaseResponse {
  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;
}

class UserRole extends BaseResponse {
  @ApiProperty()
  role_id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  role: Role;
}

export class AccountResponse extends BaseResponse {
  @ApiProperty()
  public email: string;

  @ApiProperty()
  public firstName: string;

  @ApiProperty()
  public lastName: string;

  @ApiProperty()
  public phoneCode: string;

  @ApiProperty()
  public phoneNumber: number;

  @ApiProperty()
  public isActive: boolean;

  @ApiProperty()
  public role: ROLE;
}
