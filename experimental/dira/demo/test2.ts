import { Controller, getRoutes, Route } from '../src';
import { WrustbrotType } from './types';

@Controller({ base: '/api/:subscriptionId', name: 'api' })
export class ApiCtrl {
  static {
    /* oder statt @Controller */
    // register(ApiCtrl, "/api/:subscriptionId", "api");
  }

  @Route({ method: ['GET'], path: '' }) index() {}

  @Route({ method: ['GET', 'POST'] })
  getApiInfo(): WrustbrotType {}
}

console.log(getRoutes(ApiCtrl));
