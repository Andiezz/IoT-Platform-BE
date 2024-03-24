import { SetMetadata } from '@nestjs/common';
import { ROLE } from 'src/shared/models/user.model';

export const ROLES_KEY = 'roles';
export const Roles = (roles: ROLE[]) => SetMetadata(ROLES_KEY, roles);
