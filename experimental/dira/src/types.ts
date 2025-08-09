import { RequestFactory } from './lib/Request/RequestFactory';

export interface AppI {}

declare module 'dira-app' {
  class AppI {
    requestFactory: RequestFactory;
  }
}
