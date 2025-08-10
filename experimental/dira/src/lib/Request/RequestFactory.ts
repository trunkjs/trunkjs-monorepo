import { Container, ContainerProviderRegistry } from '../Container/Container';
import { App } from '../DiraApp';
import { Req } from './Req';

export type BodyReader = () => Promise<any>;

export interface RequestScope {
  container: Container;
  request: Req;
}

export class RequestFactory extends ContainerProviderRegistry {
  constructor(protected app: App) {
    super();
  }

  /**
   * Create a new UniversalRequest instance.
   * Ensures path is derived from url if not provided.
   */
  getNewInstance(init: Partial<Req>, raw: any, bodyReader: BodyReader): Req {
    const ensureInit = { ...init };
    if (!ensureInit.path && ensureInit.url) {
      try {
        const u = new URL(ensureInit.url, 'http://localhost');
        ensureInit.path = u.pathname || '';
      } catch {
        // ignore invalid URL
      }
    }
    return new Req(ensureInit, raw, bodyReader);
  }
}
