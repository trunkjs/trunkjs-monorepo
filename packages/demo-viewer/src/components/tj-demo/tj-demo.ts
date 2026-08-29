import { LitElement, html, nothing, unsafeCSS } from 'lit';

import type { TDemoDefinition, TDemoEnvironment } from '../../types';
import '../tj-demo-controls/tj-demo-controls';
import style from './tj-demo.scss?inline';

export class TjDemo extends LitElement {
  static override properties = {
    data: { attribute: false },
    fullscreenHref: { attribute: false },
    sourceHref: { attribute: false },
    environment: { attribute: false },
  };

  static override styles = [unsafeCSS(style)];

  declare data?: TDemoDefinition;
  declare fullscreenHref: string;
  declare sourceHref: string;
  declare environment?: TDemoEnvironment;

  constructor() {
    super();
    this.fullscreenHref = '';
    this.sourceHref = '';
  }

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
            ${this.data?.filename
              ? html`
                  <nav class="header-actions" aria-label="Demo-Aktionen">
                    <a class="header-action" href=${this.fullscreenHref}>
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
                      </svg>
                      <span>View Fullscreen</span>
                    </a>
                    <a class="header-action" href=${this.sourceHref}>
                      <svg aria-hidden="true" viewBox="0 0 24 24">
                        <path d="m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14" />
                      </svg>
                      <span>Source</span>
                    </a>
                  </nav>
                `
              : nothing}
            <slot name="header"></slot>
          </div>
        </header>

        <tj-demo-controls
          .data=${this.data?.controls ?? []}
          .actionBar=${this.data?.actionBar}
          .environment=${this.environment}
        >
          <slot name="controls" slot="controls"></slot>
        </tj-demo-controls>
      </section>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo')) {
  customElements.define('tj-demo', TjDemo);
}
