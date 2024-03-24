import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, MinLength, Matches } from 'class-validator';
import { CREATE_USER_DEFAULT } from 'src/shared/constants/system-management.constants';

export class ActivateAccountDTO {
  @ApiProperty({ description: 'Activation code' })
  @IsNotEmpty()
  public activationCode: string;

  @ApiProperty({ description: 'New password' })
  @IsNotEmpty()
  @MinLength(8)
  @Matches(CREATE_USER_DEFAULT.PASSWORD_CRITERIA, { message: 'Password is too weak' })
  public newPassword: string;

  @ApiProperty({ description: 'Confirm new password' })
  @IsNotEmpty()
  @MinLength(8)
  public confirmNewPassword: string;
}
