import { DiraApp } from '../DiraApp';
import { Req } from '../Request/Req';

export interface MiddlewareI {
  invoke: (context: HttpContext, next: () => Promise<void>) => Promise<void> | void;
}
export type Middleware = ((context: HttpContext, next: () => Promise<void>) => Promise<void> | void) | MiddlewareI;

function isMiddleware(middleware: Middleware): middleware is MiddlewareI {
  return typeof middleware === 'object' && 'invoke' in middleware && typeof middleware.invoke === 'function';
}

export interface HttpContext {
  req: Req;
  res?: Response;
  app: DiraApp;
}
