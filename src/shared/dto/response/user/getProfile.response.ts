import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetProfileResponse {
  @ApiProperty()
  public id: string;

  @ApiProperty()
  public firstName: string;

  @ApiProperty()
  public lastName: string;

  @ApiProperty()
  public phoneCode: string;

  @ApiProperty()
  public phoneNumber: string;

  @ApiProperty()
  public email: string;

  @ApiPropertyOptional()
  public avatar: string;

  @ApiProperty()
  public role: string;
}
