import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from './request-context.model';

export class RequestContextMiddleware implements NestMiddleware{
  use(req: Request, res: Response, next: NextFunction){
   RequestContext.storage.run(new RequestContext(req, res), next, 'route'); 
  }
}