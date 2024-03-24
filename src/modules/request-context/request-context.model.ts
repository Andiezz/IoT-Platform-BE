import { AsyncLocalStorage } from 'async_hooks';
import {Request, Response} from 'express';

export class RequestContext<TReq = Request, TRes = Response> {
  static storage = new AsyncLocalStorage<RequestContext>();
  static get currentContext() {
    return this.storage.getStore();
  }

  constructor(public readonly req: TReq, public readonly res: TRes) {}
}
