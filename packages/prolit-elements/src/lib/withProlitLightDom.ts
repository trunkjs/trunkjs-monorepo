import { prolit, type ProlitScope } from '@trunkjs/prolit';
import { LitElement, render, type PropertyValues, type RootPart } from 'lit';

export interface ProlitLightDomHost {
  lightScope?: ProlitScope;
}

/** Optional second Lit root alongside a host's ShadowRoot; independent of Nextrap.
 * The host keeps render(); this mixin owns only its light-DOM container and connection.
 * See README and proposals/examples/scope-placement.ts.
 * @example class View extends withProlitLightDom(LitElement) { ... }
 */
export function withProlitLightDom<T extends new (...args: any[]) => LitElement>(
  Base: T,
): T & (new (...args: any[]) => ProlitLightDomHost) {
  class WithProlitLightDom extends Base {
    static properties = { lightScope: { attribute: false } };
    declare public lightScope?: ProlitScope;
    private lightContainer?: HTMLElement;
    private lightPart?: RootPart;

    protected override update(changed: PropertyValues): void {
      if (this.renderRoot === this) {
        throw new Error(
          'withProlitLightDom requires a separate ShadowRoot; use prolit() directly for a light-only host.',
        );
      }
      super.update(changed);
      if (!this.lightContainer) {
        this.lightContainer = document.createElement('div');
        this.lightContainer.setAttribute('data-prolit-light', '');
        this.lightContainer.style.display = 'contents';
        this.append(this.lightContainer);
      }
      this.lightPart = render(prolit(this.lightScope), this.lightContainer, { isConnected: this.isConnected });
    }
    override connectedCallback(): void {
      super.connectedCallback();
      this.lightPart?.setConnected(true);
    }
    override disconnectedCallback(): void {
      super.disconnectedCallback();
      this.lightPart?.setConnected(false);
    }
  }
  return WithProlitLightDom;
}
