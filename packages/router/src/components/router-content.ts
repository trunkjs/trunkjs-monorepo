import type { RouteChange } from '../lib/router';
import type { RouteRenderContext, RouteView } from '../lib/route-renderer';
import { withRouter } from '../lib/with-router';

/** Inline outlet by default; route.presentation selects a registered renderer. */
export class RouterContent extends withRouter(HTMLElement) {
  #views: RouteView[] = [];
  #definition?: object;
  #components: readonly CustomElementConstructor[] = [];
  #presentation?: string;
  #token?: object;

  get outlet(): string { return this.getAttribute('name') || 'default'; }
  override isRouteChangeRelevant(_change: RouteChange): boolean { return true; }

  override onRouteChange(change: RouteChange): void {
    const { route } = change;
    const auxiliary = route.outlets[this.outlet];
    const definition = auxiliary?.route ?? route.definition;
    const components = auxiliary?.components ?? route.definition.outlets[this.outlet] ?? [];
    const presentation = definition.presentation;
    if (!presentation || presentation === 'inline' || components.length === 0) {
      const wasPresented = this.#token !== undefined;
      this.#dispose();
      if (wasPresented || change.initial || change.changed.primary || change.changed.outlets.has(this.outlet)) {
        this.replaceChildren(...components.map((Component) => new Component()));
      }
      return;
    }

    const renderer = this.router.getRenderer(presentation);
    if (!renderer) throw new Error(`No route renderer registered for ${presentation}`);
    if (!auxiliary && !definition.closeTo) throw new Error('Presented primary routes require closeTo.');
    const sameView = this.#definition === definition && this.#presentation === presentation
      && components.length === this.#components.length && components.every((component, i) => component === this.#components[i]);
    if (!sameView) {
      this.#dispose();
      this.replaceChildren();
      this.#definition = definition;
      this.#components = components;
      this.#presentation = presentation;
      this.#token = {};
    }
    const token = this.#token;
    const context: RouteRenderContext = {
      route, params: auxiliary?.params ?? route.params, query: route.query,
      close: () => {
        if (token !== this.#token || !this.isConnected) return;
        if (auxiliary) this.router.clearOutlet(this.outlet, { replace: true });
        else if (definition.closeTo && !this.router.replace(definition.closeTo)) {
          context.error(new Error('Dialog closeTo does not match a route.'));
        }
      },
      error: (error) => this.dispatchEvent(new CustomEvent('route-render-error', {
        detail: error, bubbles: true, composed: true,
      })),
    };
    if (sameView) this.#views.forEach((view) => view.update(context));
    else {
      try {
        for (const Component of components) this.#views.push(renderer(Component, context));
      } catch (error) {
        this.#dispose();
        context.error(error);
        throw error;
      }
    }
  }

  override disconnectedCallback(): void {
    this.#dispose();
    super.disconnectedCallback();
  }

  #dispose(): void {
    this.#token = undefined;
    const views = this.#views;
    this.#views = [];
    this.#definition = undefined;
    this.#components = [];
    this.#presentation = undefined;
    views.forEach((view) => view.dispose());
  }
}

if (!customElements.get('router-content')) customElements.define('router-content', RouterContent);
