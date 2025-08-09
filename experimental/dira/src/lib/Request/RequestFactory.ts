import { Container, ContainerProviderRegistry } from '../Container/Container';
import { DiraApp } from '../DiraApp';
import { Request } from './Request';

export type BodyReader = () => Promise<any>;

export interface RequestScope {
  container: Container;
  request: Request;
}

export class RequestFactory extends ContainerProviderRegistry {
  constructor(protected app: DiraApp) {
    super();
  }

  /**
   * Create a new UniversalRequest instance.
   * Ensures path is derived from url if not provided.
   */
  getNewInstance(init: Partial<Request>, raw: any, bodyReader: BodyReader): Request {
    const ensureInit = { ...init };
    if (!ensureInit.path && ensureInit.url) {
      try {
        const u = new URL(ensureInit.url, 'http://localhost');
        ensureInit.path = u.pathname || '';
      } catch {
        // ignore invalid URL
      }
    }
    return new Request(ensureInit, raw, bodyReader);
  }
}
