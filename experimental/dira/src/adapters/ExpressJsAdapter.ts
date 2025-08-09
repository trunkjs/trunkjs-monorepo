import { Adapter } from '../lib/Interfaces/Adapter';

class ExpressJsAdapter implements Adapter {
  constructor(public port: 3000) {}

  listen(): void {}
}
