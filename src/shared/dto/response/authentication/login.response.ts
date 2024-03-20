import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/shared/model/users.model';

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
  public role?: UserRole;
}