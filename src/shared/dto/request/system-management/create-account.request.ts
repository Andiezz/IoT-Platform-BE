import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ROLE } from 'src/shared/models/user.model';

export class CreateAccountDTO {
  @ApiProperty({ description: 'First name of account' })
  @IsNotEmpty()
  public firstName: string;

  @ApiProperty({ description: 'Last name of account' })
  @IsNotEmpty()
  public lastName: string;

  @ApiProperty({ description: 'Email of account' })
  @IsNotEmpty()
  @IsEmail()
  public email: string;

  @ApiProperty({ description: "Phone number's code of account" })
  @IsNotEmpty()
  public phoneCode: string;

  @ApiProperty({ description: 'Phone number of account' })
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => String(value))
  public phoneNumber: string;

  @ApiProperty({ description: 'Role of account' })
  @IsEnum(ROLE)
  @IsNotEmpty()
  public role: ROLE;
}
