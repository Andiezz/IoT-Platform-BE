import { OmitType } from '@nestjs/swagger';
import { CreateAccountDTO } from '../system-management/create-account.request';

export class UserUpdateAccountDTO extends OmitType(CreateAccountDTO, ['email']) { }
