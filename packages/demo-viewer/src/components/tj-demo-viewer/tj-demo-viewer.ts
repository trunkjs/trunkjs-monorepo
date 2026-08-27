import { LitElement, html, unsafeCSS } from 'lit';

import { DemoRegistry } from '../../lib/DemoRegistry';
import { getDemoViewHref, readDemoViewMode, type TDemoViewMode } from '../../lib/demoViewMode';
import type { TDemoDefinition, TNavData } from '../../types';
import '../tj-demo-renderer/tj-demo-renderer';
import '../tj-demo-viewer-nav/tj-demo-viewer-nav';
import '../tj-demo/tj-demo';
import style from './tj-demo-viewer.scss?inline';

export class TjDemoViewer extends LitElement {
  static override properties = {
    navData: { state: true },
    selectedDemo: { state: true },
    viewMode: { state: true },
  };

  static override styles = [unsafeCSS(style)];

  navData?: TNavData;
  selectedDemo?: TDemoDefinition;
  viewMode: TDemoViewMode = 'default';

  #demos: TDemoDefinition[] = [];
  #registry = new DemoRegistry([]);
  #renderToken = 0;

  set demos(value: TDemoDefinition[]) {
    this.#demos = Array.isArray(value) ? value : [];
    this.#registry = new DemoRegistry(this.#demos);
    this.navData = this.#registry.getNavData();
    this.selectedDemo = this.#getSelectedDemo();

    if (!this.selectedDemo && typeof window !== 'undefined' && !window.location.hash) {
      const firstDemo = this.#registry.getFirstDemo();

      if (firstDemo) {
        window.history.replaceState(null, '', this.#registry.getDemoHref(firstDemo));
        this.selectedDemo = firstDemo;
        window.dispatchEvent(new Event('hashchange'));
      }
    }

    this.requestUpdate();
  }

  get demos() {
    return this.#demos;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.viewMode = readDemoViewMode(window.location.search);
    window.dispatchEvent(new CustomEvent('tj:viewerReady', { detail: { viewer: this } }));
    window.addEventListener('hashchange', this.#onLocationChange);
    window.addEventListener('popstate', this.#onLocationChange);
  }

  override disconnectedCallback() {
    window.removeEventListener('hashchange', this.#onLocationChange);
    window.removeEventListener('popstate', this.#onLocationChange);
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (
      changedProperties.has('selectedDemo') ||
      changedProperties.has('navData') ||
      changedProperties.has('viewMode')
    ) {
      void this.#renderSelectedDemoContent();
    }
  }

  override render() {
    if (this.viewMode !== 'default') {
      return html``;
    }

    const currentHref = typeof window === 'undefined' ? '' : window.location.href;
    const fullscreenHref = currentHref ? getDemoViewHref(currentHref, 'fullscreen') : '';
    const sourceHref = currentHref ? getDemoViewHref(currentHref, 'source') : '';

    return html`
      <div class="viewer">
        <tj-demo-viewer-nav .data=${this.navData}></tj-demo-viewer-nav>
        <slot name="controls" slot="controls"></slot>
        <main class="content">
          <tj-demo
            id="demo"
            .data=${this.selectedDemo}
            .fullscreenHref=${fullscreenHref}
            .sourceHref=${sourceHref}
          ></tj-demo>
        </main>
      </div>
    `;
  }

  #onLocationChange = () => {
    this.viewMode = readDemoViewMode(window.location.search);
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

    if (typeof this.selectedDemo.load === 'function') {
      await renderer.showDemo({
        title: this.selectedDemo.title ?? 'Demo laden',
        render(root: HTMLElement) {
          root.textContent = 'Demo wird geladen …';
        },
      });

      const loadedDemo = await this.selectedDemo.load();

      if (renderToken !== this.#renderToken) {
        return;
      }

      this.selectedDemo = loadedDemo;
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
