import { ApiProperty } from '@nestjs/swagger';

export class ValidatorErrorResponse {
  @ApiProperty({
    type: String,
    default: '2023-10-04T07:00:18.437Z',
  })
  timestamp: string;

  @ApiProperty({
    type: String,
    default: '000400',
  })
  responseCode: string;

  @ApiProperty({
    type: String,
    isArray: true,
  })
  message: string[];
}
