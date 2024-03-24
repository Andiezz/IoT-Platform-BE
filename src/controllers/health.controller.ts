import { Controller, Get,HttpCode } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('common')
@Controller('/healthz')
export class HealthController{
  
  @Get()
  @HttpCode(200)
  public async checkServiceHealth():Promise<string>{
    return 'ok';
  }
}