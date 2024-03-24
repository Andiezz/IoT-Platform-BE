import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAccountDTO } from '../system-management/create-account.request';

export class AdminUpdateAccountDTO extends CreateAccountDTO { 
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  public isActive?: boolean;
}
