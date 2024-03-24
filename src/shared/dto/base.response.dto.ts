import { ApiProperty } from '@nestjs/swagger';
import { ResponseCodeConstant } from '../constants/response.constants';

export class BaseResponse<T> {
  @ApiProperty()
  public data: T;

  @ApiProperty({ type: Date })
  public timestamp: string = new Date().toISOString();

  @ApiProperty({ type: String })
  public responseCode: ResponseCodeConstant = ResponseCodeConstant.SUCCESS;

  public message?: string;

  constructor(code: ResponseCodeConstant, msg?: string, data?: T) {
    this.data = data;
    this.responseCode = code;
    this.message = msg;
  }

  public static ok<T>(data?: T, msg: string = ''): BaseResponse<T> {
    return new BaseResponse(ResponseCodeConstant.SUCCESS, msg, data);
  }

  public static notFound<T>(msg: string = ''): BaseResponse<T> {
    return new BaseResponse(ResponseCodeConstant.RESOURCE_NOT_FOUND, msg);
  }

  public static badRequest(msg: string = '') {
    return new BaseResponse(ResponseCodeConstant.BAD_REQUEST, msg);
  }

  public static badRequestWithData<T>(data: T, msg: string= '') {
    return new BaseResponse(ResponseCodeConstant.BAD_REQUEST, msg, data);
  }

  public static unauthorized<T>(msg: string= ''): BaseResponse<T> {
    return new BaseResponse(ResponseCodeConstant.UNAUTHORIZED, msg);
  }

  public static forbidden<T>(msg: string= ''): BaseResponse<T> {
    return new BaseResponse(ResponseCodeConstant.FORBIDDEN, msg);
  }

  public static internalServerError<T>(msg: string= ''): BaseResponse<T> {
    return new BaseResponse(ResponseCodeConstant.INTERNAL_SERVER_ERROR, msg);
  }
}
