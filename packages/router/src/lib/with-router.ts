import { Router, RouteChangeEvent, type RouteChange, type RouteContext } from './router';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface RouterAware {
  readonly router: Router;
  readonly route: RouteContext | null;
  readonly params: RouteContext['params'];
  readonly query: RouteContext['query'];
  readonly meta: RouteContext['meta'];
  readonly routeName: string | undefined;
  readonly url: URL | undefined;
  onRouteChange(change: RouteChange): void | Promise<void>;
}

let defaultRouter: Router | undefined;
const defaultRouterChanges = new EventTarget();

/** Binds connected router-aware elements; call router.start() to handle browser navigation. */
export function setDefaultRouter(router: Router): void {
  if (defaultRouter === router) return;
  defaultRouter = router;
  defaultRouterChanges.dispatchEvent(new Event('change'));
}
export function hasDefaultRouter(): boolean { return defaultRouter !== undefined; }
export function getDefaultRouter(): Router {
  if (!defaultRouter) throw new Error('No default router configured. Call setDefaultRouter(router) first.');
  return defaultRouter;
}
export function getOrCreateDefaultRouter(): Router {
  if (!defaultRouter) {
    const router = new Router();
    setDefaultRouter(router);
    router.start();
    return router;
  }
  return defaultRouter;
}

export function withRouter<TBase extends Constructor<HTMLElement>>(Base: TBase) {
  abstract class RouterAwareElement extends Base implements RouterAware {
    #router?: Router;
    #listener = (event: Event) => {
      const change = (event as RouteChangeEvent).detail;
      if (this.isRouteChangeRelevant(change)) void this.onRouteChange(change);
    };

    // Mixin extension hooks must be public so TypeScript can emit declarations.
    resolveRouter(): Router { return getDefaultRouter(); }
    isRouteChangeRelevant(_change: RouteChange): boolean { return true; }
    get router(): Router { return this.#router ?? this.resolveRouter(); }
    get route(): RouteContext | null { return this.router.current; }
    get params(): RouteContext['params'] { return this.route?.params ?? {}; }
    get query(): RouteContext['query'] { return this.route?.query ?? new URLSearchParams(); }
    get meta(): RouteContext['meta'] { return this.route?.meta ?? {}; }
    get routeName(): string | undefined { return this.route?.name; }
    get url(): URL | undefined { return this.route?.url; }

    connectedCallback() {
      // @ts-ignore mixins can extend HTMLElement subclasses with lifecycle methods
      super.connectedCallback?.();
      defaultRouterChanges.addEventListener('change', this.#bindRouter);
      this.#bindRouter();
    }

    #bindRouter = () => {
      this.#router?.removeEventListener(RouteChangeEvent.type, this.#listener);
      // Imported custom elements may connect before application setup runs.
      if (!hasDefaultRouter() && this.resolveRouter === RouterAwareElement.prototype.resolveRouter) return;
      this.#router = this.resolveRouter();
      this.#router.addEventListener(RouteChangeEvent.type, this.#listener);
      if (this.#router.current) {
        const route = this.#router.current;
        void this.onRouteChange({ route, previousRoute: null, initial: true, changed: { primary: true, outlets: new Set(Object.keys(route.outlets)), query: true, hash: true } });
      }
    };

    disconnectedCallback() {
      defaultRouterChanges.removeEventListener('change', this.#bindRouter);
      this.#router?.removeEventListener(RouteChangeEvent.type, this.#listener);
      this.#router = undefined;
      // @ts-ignore mixins can extend HTMLElement subclasses with lifecycle methods
      super.disconnectedCallback?.();
    }

    onRouteChange(_change: RouteChange): void | Promise<void> {}
  }
  return RouterAwareElement;
}
