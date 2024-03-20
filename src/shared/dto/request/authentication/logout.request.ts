import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class LogoutDTO {
  @IsNotEmpty()
  @ApiProperty()
  public token: string;
}