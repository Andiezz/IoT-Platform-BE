import { ExceptionFilter, Catch, ArgumentsHost, HttpException, BadRequestException, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Response } from 'express';
import { BaseResponse } from '../dto/base.response.dto';
import { ResponseCodeConstant } from '../constants/ResponseConstants';


@Catch(HttpException)
export class GlobalExceptionFilter implements ExceptionFilter {

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    let data: BaseResponse<unknown>;
    if (exception instanceof BadRequestException) {
      data = BaseResponse.badRequest(exception.message);
    } else if (exception instanceof UnauthorizedException) {
      data = new BaseResponse(ResponseCodeConstant.UNAUTHORIZED, exception.message);
    } else if (exception instanceof NotFoundException) {
      data = new BaseResponse(ResponseCodeConstant.RESOURCE_NOTFOUND, exception.message);
    } else if (exception instanceof ForbiddenException) {
      data = new BaseResponse(ResponseCodeConstant.FORBIDDEN, exception.message);
    } else {
      data = new BaseResponse(ResponseCodeConstant.INTERNAL_SERVER_ERROR, process.env.NODE_ENV != 'production' ? JSON.stringify(exception) : '');
    }

    response.status(status).json(data);
  }

}