import { AppI } from '../types';
import { Container } from './Container/Container';
import { RequestFactory } from './Request/RequestFactory';

export class DiraApp extends Container implements AppI {
  constructor() {
    super();
    this.init();
  }

  private init() {
    // Initialization logic can go here
    console.log('DiraApp initialized');
    this.registerFactory('RequestFactory', () => new RequestFactory(this));
  }

  get requestFactory(): RequestFactory {
    return this.resolve('RequestFactory');
  }

  //  get router() {
  //
  //  }

  public addController(controller: any, middlewares: []) {}
}
