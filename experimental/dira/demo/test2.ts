import { App, Controller, Inject, Route } from '../src';

@Controller({ base: '/api/:subscriptionId', name: 'api' })
export class ApiCtrl {
  static {
    /* oder statt @Controller */
    // register(ApiCtrl, "/api/:subscriptionId", "api");
  }

  @Inject()
  public app!: App;

  @Route({ method: ['GET'], path: '' })
  index() {}

  @Route({ method: ['GET', 'POST'] })
  getApiInfo() {}
}

//console.log(getRoutes(ApiCtrl));

let test = new ApiCtrl();
