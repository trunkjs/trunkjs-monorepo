import { Get, getServerRoutes, Post } from '../src';
import { HttpContext } from '../src/lib/Middleware/HttpContext';

export let DECORATOR_MODE: 'native' | 'legacy' | 'unknown' = 'unknown';

(function detectDecoratorMode() {
  let argc = -1;
  function Probe(...args: any[]) {
    argc = args.length;
  }

  // Triggert den Compiler-Emit für Methodendekoratoren:
  class __Probe {
    // @ts-expect-error: nur zum Erkennen
    @Probe
    m() {}
  }

  DECORATOR_MODE = argc === 2 ? 'native' : argc === 3 ? 'legacy' : 'unknown';
  if (DECORATOR_MODE !== 'native') {
    throw new Error("Legacy decorators detected. Bitte 'experimentalDecorators' deaktivieren (native TC39 nutzen).");
  }
})();
export type Wrust = {
  invokeId: string;
};

@ServerRoute('/api/:subscriptionId', 'api')
export class ApiCtrl {
  @Get()
  __invoke() {
    // Special method to handle the class route
    // Will be called if the ApiCtrl route is invoked
  }

  /**
   * If presnet all request will trigger this method as middleware
   * @param ctx
   * @param next
   */
  __process(ctx: HttpContext, next: () => Promise<void>) {
    // This method is called after the __invoke method
    // It can be used to process the request and response
    // ctx.req is the Request object
    // ctx.res is the Response object
    // ctx.app is the DiraApp instance
  }

  @Get()
  @Post()
  @Cli()
  @Params({ invokeId: 'string', userId: { type: 'string', desc: 'the userId' } }) // Define both query an cli params
  getApiInfo(request: Request) {
    // name -> api.getApiInfo
    // path -> /api/:subscriptionId/getApiInfo
    // method -> GET, POST
  }
}

@ServerRoute('/user', 'user')
@QueryParams({ invokeId: 'string' }) // -> these query params must be present in all subsequent methods
export class UserCtrl {
  @Get()
  @Post()
  @QueryParams({ userId: 'string' })
  getUserInfo(request: Request) {
    // name -> api.user.getUserInfo
    // path -> /api/:subscriptionId/user/getUserInfo
    // method -> GET, POST
  }
}

console.log(getServerRoutes(UserCtrl));
