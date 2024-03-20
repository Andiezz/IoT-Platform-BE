import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { BaseResponse } from '../dto/base.response.dto';
import { Observable, catchError, map, throwError } from 'rxjs';

@Injectable()
export class ResponseTransformer<T> implements NestInterceptor<T, BaseResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponse<T>> | Promise<Observable<BaseResponse<T>>> {
    return next.handle().pipe(
      map((data) => {
        return BaseResponse.ok(data);
      }),
      catchError((err) =>
        throwError(() => {
          if (err instanceof HttpException) {
            throw err;
          }

          return new InternalServerErrorException({
            cause: err,
          });
        }),
      ),
    );
  }
}
