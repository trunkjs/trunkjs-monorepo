type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface RouterAware {
  readonly router: Router;
  onRouteChange(change: RouteChange): void | Promise<void>;
}

let defaultRouter: Router | undefined;

export function setDefaultRouter(router: Router): void {
  defaultRouter = router;
}

export function getDefaultRouter(): Router {
  if (!defaultRouter) throw new Error('No default router configured. Call setDefaultRouter(router) first.');
  return defaultRouter;
}

export function withRouter<TBase extends Constructor<HTMLElement>>(Base: TBase) {
  abstract class RouterAwareElement extends Base implements RouterAware {
    #router?: Router;
    #listener = (event: Event) => {
      void this.onRouteChange((event as RouteChangeEvent).detail);
    };

    get router(): Router {
      return this.#router ?? getDefaultRouter();
    }

    connectedCallback() {
      // @ts-ignore mixins can extend HTMLElement subclasses with lifecycle methods
      super.connectedCallback?.();
      this.#router = getDefaultRouter();
      this.#router.addEventListener(RouteChangeEvent.type, this.#listener);
      if (this.#router.current) {
        void this.onRouteChange({ route: this.#router.current, previousRoute: null });
      }
    }

    disconnectedCallback() {
      this.#router?.removeEventListener(RouteChangeEvent.type, this.#listener);
      this.#router = undefined;
      // @ts-ignore mixins can extend HTMLElement subclasses with lifecycle methods
      super.disconnectedCallback?.();
    }

    onRouteChange(_change: RouteChange): void | Promise<void> {}
  }

  return RouterAwareElement;
}

export class RouterContent extends withRouter(HTMLElement) {
  override onRouteChange({ route }: RouteChange): void {
    this.replaceChildren(...route.definition.components.map((Component) => new Component()));
  }
}

if (!customElements.get('router-content')) {
  customElements.define('router-content', RouterContent);
}
