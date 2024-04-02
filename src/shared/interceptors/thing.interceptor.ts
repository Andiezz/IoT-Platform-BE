import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ROLE } from '../models/user.model';

@Injectable()
export class ThingInterceptor implements NestInterceptor {
  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    if (!ROLE.ADMIN === request?.user) throw new ForbiddenException();

    return next.handle().pipe(map((data: any) => data));
  }
}
