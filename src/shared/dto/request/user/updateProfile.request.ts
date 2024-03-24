import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDTO {
  @IsOptional()
  @ApiPropertyOptional()
  public firstName?: string;

  @IsOptional()
  @ApiPropertyOptional()
  public lastName?: string;

  @IsOptional()
  @MaxLength(4)
  @ApiPropertyOptional()
  @Matches(/^([\+[0-9]{1,5})/, { message: 'Phone code is invalid' })
  public phoneCode?: string;

  @IsOptional()
  @MinLength(4)
  @MaxLength(15)
  @Matches(/\d/, { message: 'Phone number is invalid' })
  @ApiPropertyOptional()
  public phoneNumber?: string;

  @IsOptional()
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  public file?: Express.Multer.File;
}
