import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'src/shared/model/users.model';

export class GetProfileResponse {
  @ApiProperty()
  public id: string;
  @ApiProperty()
  public first_name: string;
  @ApiProperty()
  public last_name: string;
  @ApiProperty()
  public phone_code: string;
  @ApiProperty()
  public phone_number: string;
  @ApiProperty()
  public email: string;
  @ApiProperty()
  public avatar: string;
  @ApiProperty()
  public role?: UserRole;
}