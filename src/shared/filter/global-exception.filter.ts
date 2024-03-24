import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Response } from 'express';

import { TransformedResponseDto } from '../dto/response/transformed-response.dto';
import { ValidatorErrorResponse } from '../interface/validator-error-response';

@Catch(HttpException)
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    let data: TransformedResponseDto<unknown>;
    if (exception instanceof BadRequestException) {
      const exceptionResponse = exception.getResponse() as ValidatorErrorResponse;
      const details = exceptionResponse?.message ?? [];

      data = TransformedResponseDto.badRequest(exception.message, details);
    } else if (exception instanceof UnauthorizedException) {
      data = TransformedResponseDto.unauthorize(exception.message);
    } else if (exception instanceof NotFoundException) {
      data = TransformedResponseDto.notFound(exception.message);
    } else if (exception instanceof ConflictException) {
      data = TransformedResponseDto.conflict(exception.message);
    } else if (exception instanceof ForbiddenException) {
      data = TransformedResponseDto.forbidden(exception.message);
    } else {
      data = TransformedResponseDto.serverError(exception);
    }

    response.status(status).json(data);
  }
}
