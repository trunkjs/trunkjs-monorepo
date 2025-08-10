import * as ts from 'typescript';
import { AppI } from '../types';
import { Container } from './Container/Container';
import { Req } from './Request/Req';
import { RequestFactory } from './Request/RequestFactory';
import CompilerOptionsDiagnosticsRequestArgs = ts.server.protocol.CompilerOptionsDiagnosticsRequestArgs;

class DiraApp extends Container implements AppI {
  constructor() {
    super();
    this.init();
  }

  private init() {
    // Initialization logic can go here
    console.log('DiraApp initialized');
    this.registerFactory('requestFactory', () => new RequestFactory(this));
    this.register('req', null);
  }

  public beforeRequest() {}

  public afterRequest() {}

  get requestFactory(): RequestFactory {
    return this.resolve('requestFactory');
  }

  get request(): Req {
    if (!this.hasToken('req')) {
      throw new Error("Request 'req' not initialized. Maybe you are instanciating Di Classes directly?");
    }
    return this.resolve('req');
  }

  //  get router() {
  //
  //  }

  public addController(controller: any, middlewares: []) {}
}

export type App = InstanceType<typeof DiraApp>;

const __app = new DiraApp();

export function app(): App {
  return __app;
}
