import { Controller, getRoutes, Route } from '../src';

@Controller({ base: '/api/:subscriptionId', name: 'api' })
export class ApiCtrl {
  static {
    /* oder statt @Controller */
    // register(ApiCtrl, "/api/:subscriptionId", "api");
  }

  @Route({ method: ['GET'], path: '' }) index() {}

  @Route({ method: ['GET', 'POST'] })
  getApiInfo() {}
}

console.log(getRoutes(ApiCtrl));
