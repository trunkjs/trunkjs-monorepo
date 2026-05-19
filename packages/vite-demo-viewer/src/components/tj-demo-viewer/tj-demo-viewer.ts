import { LitElement, html, unsafeCSS } from 'lit';

import { DemoRegistry } from '../../lib/DemoRegistry';
import type { TDemoDefinition, TNavData } from '../../types';
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

        <main class="content">
          <tj-demo id="demo" .data=${this.selectedDemo}></tj-demo>
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
    const demoElement = this.shadowRoot?.querySelector('tj-demo') as HTMLElement | null;
    if (!demoElement) {
      return;
    }

    const renderToken = ++this.#renderToken;
    demoElement.replaceChildren();

    if (!this.selectedDemo) {
      demoElement.textContent = 'Demo auswählen';
      return;
    }

    if (typeof this.selectedDemo.render === 'function') {
      await this.selectedDemo.render(demoElement);
      if (renderToken !== this.#renderToken) {
        return;
      }
      return;
    }

    this.#appendDefinitionContent(demoElement, this.selectedDemo);
    this.#appendDefinitionControls(demoElement, this.selectedDemo);

    if (renderToken !== this.#renderToken) {
      return;
    }

    if (demoElement.childNodes.length === 0) {
      demoElement.textContent = 'Demo exportiert keine render(root)-Funktion';
    }
  }

  #appendDefinitionContent(target: HTMLElement, definition: TDemoDefinition) {
    if (definition.wrapper_html && typeof definition.wrapper_html === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = definition.wrapper_html.replace('{{content}}', definition.html ?? '');
      target.append(...Array.from(wrapper.childNodes));
      return;
    }

    if (definition.html) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = definition.html;
      target.append(...Array.from(wrapper.childNodes));
    }
  }

  #appendDefinitionControls(target: HTMLElement, definition: TDemoDefinition) {
    if (!definition.controls_raw_html) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.slot = 'controls';
    wrapper.innerHTML = definition.controls_raw_html;
    target.append(wrapper);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-viewer')) {
  customElements.define('tj-demo-viewer', TjDemoViewer);
}
