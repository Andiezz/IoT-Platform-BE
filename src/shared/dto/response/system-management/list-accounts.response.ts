import { ApiProperty } from '@nestjs/swagger';

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
  public first_name: string;

  @ApiProperty()
  public last_name: string;

  @ApiProperty()
  public phone_code: string;

  @ApiProperty()
  public phone_number: number;

  @ApiProperty()
  public is_active: boolean;

  @ApiProperty()
  public user_role: UserRole;
}
