import { EventBindingsMixin } from '@trunkjs/browser-utils';
import { prolit, type ProlitScope } from '@trunkjs/prolit';
import { html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

/** Optional Lit host for one Prolit scope. Shadow DOM is Lit's default; override
 * createRenderRoot() to return this when the scope should render in light DOM.
 * The inherited on() and @Listen APIs attach listeners for each connection.
 * The scope directive owns its own mount, updates, errors, and cleanup.
 */
export abstract class ProlitElement extends EventBindingsMixin(LitElement) {
  @property({ attribute: false })
  public scope?: ProlitScope;

  protected override render(): unknown {
    return html`${prolit(this.scope)}`;
  }
}
