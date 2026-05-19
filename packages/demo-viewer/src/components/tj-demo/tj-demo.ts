import { LitElement, html, nothing, unsafeCSS } from 'lit';

import type { TDemoDefinition } from '../../types';
import '../tj-demo-controls/tj-demo-controls';
import style from './tj-demo.scss?inline';

export class TjDemo extends LitElement {
  static override properties = {
    data: { attribute: false },
  };

  static override styles = [unsafeCSS(style)];

  declare data?: TDemoDefinition;

  override render() {
    const title = this.data?.title ?? '';
    const description = this.data?.description ?? '';

    return html`
      <section class="demo">
        <header class="header">
          <div class="header-copy">
            ${title ? html`<h2 class="title">${title}</h2>` : nothing}
            ${description ? html`<p class="description">${description}</p>` : nothing}
          </div>

          <div class="header-extra">
            <slot name="header"></slot>
          </div>
        </header>

        <tj-demo-controls .data=${this.data?.controls ?? []}>
          <slot name="controls" slot="controls"></slot>
        </tj-demo-controls>
      </section>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo')) {
  customElements.define('tj-demo', TjDemo);
}
