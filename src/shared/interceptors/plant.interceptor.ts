import { CallHandler, ExecutionContext, NestInterceptor, Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ROLES } from 'src/shared/constants/permission.constants';

@Injectable()
export class PlantInterceptor implements NestInterceptor {
    constructor() { }

    async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
        let {
            user
        } = context.switchToHttp().getRequest();

        if (![ROLES.SUPER_ADMIN, ROLES.TENANT_ADMIN, ROLES.CUSTOMER_SERVICE].includes(user.role.role))
            throw new ForbiddenException();

        return next.handle().pipe(map((data: any) => data));
    }
}
