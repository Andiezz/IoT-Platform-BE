import { HttpException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

import { ResponseCodeConstant } from 'src/shared/constants/response.constants';

export class TransformedResponseDto<T> {
  @ApiProperty()
  public data: T;

  @ApiProperty({ type: Date })
  public timestamp: string = new Date().toISOString();

  @ApiProperty({ type: String, default: '000200' })
  public responseCode: ResponseCodeConstant = ResponseCodeConstant.SUCCESS;

  @ApiProperty({ type: String, default: 'response message' })
  public message?: string;

  @ApiProperty({ type: String, isArray: true })
  public details?: string[];

  constructor(code: ResponseCodeConstant, msg?: string, data?: T, details?: string[]) {
    this.data = data;
    this.responseCode = code;
    this.message = msg;
    this.details = details;
  }

  public static ok<T>(data: T): TransformedResponseDto<T> {
    return new TransformedResponseDto(ResponseCodeConstant.SUCCESS, '', data);
  }

  public static notFound<T>(msg: string): TransformedResponseDto<T> {
    return new TransformedResponseDto(ResponseCodeConstant.RESOURCE_NOT_FOUND, msg);
  }

  public static badRequest<T>(msg: string, details?: string[]): TransformedResponseDto<T> {
    return new TransformedResponseDto(ResponseCodeConstant.BAD_REQUEST, msg, undefined, details);
  }

  public static unauthorize<T>(msg: string): TransformedResponseDto<T> {
    return new TransformedResponseDto(ResponseCodeConstant.UNAUTHORIZED, msg);
  }

  public static forbidden<T>(msg: string): TransformedResponseDto<T> {
    return new TransformedResponseDto(ResponseCodeConstant.FORBIDDEN, msg);
  }

  public static conflict<T>(msg: string): TransformedResponseDto<T> {
    return new TransformedResponseDto(ResponseCodeConstant.CONFLICT, msg);
  }

  public static serverError<T>(exception: HttpException): TransformedResponseDto<T> {
    return new TransformedResponseDto(
      ResponseCodeConstant.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV != 'production' ? JSON.stringify(exception) : '',
    );
  }
}
