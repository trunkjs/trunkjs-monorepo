import { EventBindingsMixin } from '@trunkjs/browser-utils';
import { prolit, type ProlitScope } from '@trunkjs/prolit-renderer';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/** Optional Lit host for one Prolit scope. Light DOM is the default.
 * Set static useShadowDom = true only for components that need style isolation.
 * The inherited on() and @Listen APIs attach listeners for each connection.
 * The scope directive owns its own mount, updates, errors, and cleanup.
 */
export abstract class ProlitElement extends EventBindingsMixin(LitElement) {
  /** Opt in only when embedding an isolated widget; ordinary application elements use light DOM. */
  static useShadowDom = false;

  @property({ attribute: false })
  protected scope?: ProlitScope;

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return (this.constructor as typeof ProlitElement).useShadowDom
      ? super.createRenderRoot()
      : this;
  }

  protected override render(): unknown {
    return html`${prolit(this.scope)}`;
  }
}
