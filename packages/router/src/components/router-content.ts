import type { Router, RouteChange } from '../lib/router';
import { getOrCreateDefaultRouter, withRouter } from '../lib/with-router';

/**
 * Renders the active route in <router-content>, or a named outlet with
 * <router-content name="sidebar">. Import from @trunkjs/router to register it.
 */
export class RouterContent extends withRouter(HTMLElement) {
  protected override resolveRouter(): Router { return getOrCreateDefaultRouter(); }
  get outlet(): string { return this.getAttribute('name') || 'default'; }
  protected override isRouteChangeRelevant(change: RouteChange): boolean { return change.initial || change.changed.primary || change.changed.outlets.has(this.outlet); }

  override onRouteChange({ route }: RouteChange): void {
    const auxiliary = route.outlets[this.outlet];
    const components = auxiliary?.components ?? route.definition.outlets[this.outlet] ?? [];
    this.replaceChildren(...components.map((Component) => new Component()));
  }
}

if (!customElements.get('router-content')) customElements.define('router-content', RouterContent);
