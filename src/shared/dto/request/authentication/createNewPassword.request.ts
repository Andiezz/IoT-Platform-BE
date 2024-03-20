import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, Matches } from 'class-validator';
import { Match } from 'src/shared/validations/match.validation';

export class CreateNewPasswordDTO {
  @IsNotEmpty()
  @ApiProperty()
  public token: string;

  @IsNotEmpty({ message: 'This field is not empty' })
  @ApiProperty()
  @MinLength(8, { message: 'Password is too short' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\W|_)(?=.*\d).*$/, { message: 'Password is too weak' })
  public newPassword: string;

  @IsNotEmpty()
  @ApiProperty()
  @Match('newPassword')
  public confirmPassword: string;
}
