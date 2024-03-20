import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResentActiveLinkDTO {
  @IsNotEmpty()
  @IsEmail()
  @ApiProperty()
  public email: string;
}