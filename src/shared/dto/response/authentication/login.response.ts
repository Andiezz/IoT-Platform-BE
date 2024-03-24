import { ApiProperty } from '@nestjs/swagger';
import { ROLE } from 'src/shared/models/user.model';

export class LoginResponse {
  @ApiProperty()
  public id: string;

  @ApiProperty()
  public email: string;

  @ApiProperty()
  public token: string;

  @ApiProperty()
  public refreshToken: string;

  @ApiProperty()
  public role?: ROLE;
}
