import { LitElement, html, unsafeCSS } from 'lit';

import { DemoRegistry } from '../../lib/DemoRegistry';
import type { TDemoDefinition, TNavData } from '../../types';
import '../tj-demo-renderer/tj-demo-renderer';
import '../tj-demo-viewer-nav/tj-demo-viewer-nav';
import '../tj-demo/tj-demo';
import style from './tj-demo-viewer.scss?inline';

export class TjDemoViewer extends LitElement {
  static override properties = {
    navData: { state: true },
    selectedDemo: { state: true },
  };

  static override styles = [unsafeCSS(style)];

  navData?: TNavData;
  selectedDemo?: TDemoDefinition;

  #demos: TDemoDefinition[] = [];
  #registry = new DemoRegistry([]);
  #renderToken = 0;

  set demos(value: TDemoDefinition[]) {
    this.#demos = Array.isArray(value) ? value : [];
    this.#registry = new DemoRegistry(this.#demos);
    this.navData = this.#registry.getNavData();
    this.selectedDemo = this.#getSelectedDemo();
    this.requestUpdate();
  }

  get demos() {
    return this.#demos;
  }

  override connectedCallback() {
    super.connectedCallback();
    window.dispatchEvent(new CustomEvent('tj:viewerReady', { detail: { viewer: this } }));
    window.addEventListener('hashchange', this.#onHashChange);
  }

  override disconnectedCallback() {
    window.removeEventListener('hashchange', this.#onHashChange);
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('selectedDemo') || changedProperties.has('navData')) {
      void this.#renderSelectedDemoContent();
    }
  }

  override render() {
    return html`
      <div class="viewer">
        <tj-demo-viewer-nav .data=${this.navData}></tj-demo-viewer-nav>
        <slot name="controls" slot="controls"></slot>
        <main class="content">
          <tj-demo id="demo" .data=${this.selectedDemo}> </tj-demo>
        </main>
      </div>
    `;
  }

  #onHashChange = () => {
    this.selectedDemo = this.#getSelectedDemo();
  };

  #getSelectedDemo() {
    const hash = typeof window === 'undefined' ? '' : window.location.hash;
    return this.#registry.getDemoByHash(hash);
  }

  async #renderSelectedDemoContent() {
    const renderer = document.querySelector('tj-demo-renderer') as {
      showDemo(demo: TDemoDefinition): Promise<void> | void;
    } | null;

    if (!renderer) {
      return;
    }

    const renderToken = ++this.#renderToken;
    this.#clearGeneratedControls();

    if (!this.selectedDemo) {
      await renderer.showDemo({
        title: 'Demo auswählen',
        render(root: HTMLElement) {
          root.textContent = 'Demo auswählen';
        },
      });
      return;
    }

    await renderer.showDemo(this.selectedDemo);

    if (renderToken !== this.#renderToken) {
      return;
    }

    this.#appendDefinitionControls(this.selectedDemo);
  }

  #appendDefinitionControls(definition: TDemoDefinition) {
    if (!definition.controls_raw_html) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.slot = 'controls';
    wrapper.dataset['generatedControls'] = '';
    wrapper.innerHTML = definition.controls_raw_html;
    this.append(wrapper);
  }

  #clearGeneratedControls() {
    for (const element of Array.from(this.querySelectorAll('[data-generated-controls]'))) {
      element.remove();
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-viewer')) {
  customElements.define('tj-demo-viewer', TjDemoViewer);
}
