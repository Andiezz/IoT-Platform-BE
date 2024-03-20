import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDTO {
  @IsOptional()
  @ApiPropertyOptional()
  public first_name?: string;

  @IsOptional()
  @ApiPropertyOptional()
  public last_name?: string;

  @IsOptional()
  @MaxLength(4)
  @ApiPropertyOptional()
  @Matches(/^([\+[0-9]{1,5})/, { message: 'Phone code is invalid' })
  public phone_code?: string;

  @IsOptional()
  @MinLength(4)
  @MaxLength(15)
  @Matches(/\d/, { message: 'Phone number is invalid' })
  @ApiPropertyOptional()
  public phone_number?: string;

  @IsOptional()
  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  public file?: Express.Multer.File;
}
