import { LitElement, html, unsafeCSS } from 'lit';

import { DemoRegistry } from '../../lib/DemoRegistry';
import { getDemoViewHref, readDemoViewMode, type TDemoViewMode } from '../../lib/demoViewMode';
import type {
  TDemoActionBarEnvironment,
  TDemoActionBarItem,
  TDemoCleanup,
  TDemoDefinition,
  TDemoEnvironment,
  TNavData,
} from '../../types';
import '../tj-demo-controls/tj-demo-controls';
import type { TjDemoControls } from '../tj-demo-controls/tj-demo-controls';
import '../tj-demo-renderer/tj-demo-renderer';
import '../tj-demo-toast/tj-demo-toast';
import type { TjDemoToast } from '../tj-demo-toast/tj-demo-toast';
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
  #demoCleanup?: TDemoCleanup;
  #outputValues = new Map<string, unknown>();
  #initialOutputValues = new Map<string, unknown>();

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
    void this.#runDemoCleanup();
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
      return html`<tj-demo-toast id="toast"></tj-demo-toast>`;
    }

    const currentHref = typeof window === 'undefined' ? '' : window.location.href;
    const fullscreenHref = currentHref ? getDemoViewHref(currentHref, 'fullscreen') : '';
    const sourceHref = currentHref ? getDemoViewHref(currentHref, 'source') : '';

    return html`
      <div class="viewer">
        <tj-demo-toast id="toast"></tj-demo-toast>
        <tj-demo-viewer-nav .data=${this.navData}></tj-demo-viewer-nav>
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
    const renderer = document.querySelector('tj-demo-renderer') as
      (HTMLElement & { showDemo(demo: TDemoDefinition): Promise<HTMLElement> }) | null;

    if (!renderer) {
      return;
    }

    const renderToken = ++this.#renderToken;
    this.#outputValues.clear();
    this.#initialOutputValues.clear();
    this.#clearGeneratedControls(renderer);
    const currentControls = renderer.querySelector<HTMLElement>(':scope > tj-demo-controls[data-viewer-controls]');
    if (currentControls) currentControls.hidden = true;

    if (!this.selectedDemo) {
      currentControls?.remove();
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

    await this.#runDemoCleanup();
    const root = await renderer.showDemo(this.selectedDemo);

    if (renderToken !== this.#renderToken) {
      return;
    }

    const environment = this.#createEnvironment(this.selectedDemo, root, renderer);
    await this.#initializeOutputs(this.selectedDemo, environment);
    if (renderToken !== this.#renderToken) return;

    const controls = this.#syncControls(renderer, this.selectedDemo, environment);
    await controls?.updateComplete;
    const cleanup = await this.selectedDemo.afterRender?.(environment);
    if (renderToken !== this.#renderToken) {
      if (typeof cleanup === 'function') await cleanup();
      return;
    }
    if (typeof cleanup === 'function') this.#demoCleanup = cleanup;
  }

  #createEnvironment(definition: TDemoDefinition, root: HTMLElement, renderer: HTMLElement): TDemoEnvironment {
    const toast = this.renderRoot.querySelector<TjDemoToast>('#toast');
    if (!toast) throw new Error('Demo toast is not available');

    const actionBar = () =>
      renderer.querySelector(':scope > tj-demo-controls[data-viewer-controls]') as
        (HTMLElement & TDemoActionBarEnvironment) | null;
    const outputItem = (id: string) => this.#getOutputItems(definition).find((item) => item.id === id);
    let environment: TDemoEnvironment;
    environment = {
      demo: definition,
      root,
      element: root.children.length === 1 ? (root.firstElementChild as HTMLElement) : undefined,
      state: new Map(),
      actionBar: {
        getValue: <T>(id: string) => {
          if (this.#outputValues.has(id)) return this.#outputValues.get(id) as T;
          const controls = actionBar();
          if (!controls) throw new Error(`Action bar item not found: ${id}`);
          return controls.getValue<T>(id);
        },
        setValue: (id, value) => {
          const item = outputItem(id);
          if (item) {
            this.#outputValues.set(id, value);
            this.#logOutput(toast, item, value);
            return;
          }
          const controls = actionBar();
          if (!controls) throw new Error(`Action bar item not found: ${id}`);
          controls.setValue(id, value);
        },
        refresh: async (id) => {
          await this.#refreshOutputs(definition, environment, toast, id);
          await actionBar()?.refresh(id);
        },
        reset: async (id) => {
          for (const [itemId, value] of this.#initialOutputValues) {
            if (!id || itemId === id) environment.actionBar.setValue(itemId, value);
          }
          await actionBar()?.reset(id);
        },
        setError: (id, message) => actionBar()?.setError(id, message),
      },
      toast: {
        show: (message, options) => toast.show(message, options),
        log: (...values) => toast.log(...values),
        dismiss: (id) => toast.dismiss(id),
        clearLog: () => toast.clearLog(),
      },
      query: <E extends Element>(selector: string) => {
        const element = root.querySelector<E>(selector);
        if (!element) throw new Error(`Demo element not found: ${selector}`);
        return element;
      },
      queryOptional: <E extends Element>(selector: string) => root.querySelector<E>(selector),
      queryAll: <E extends Element>(selector: string) => Array.from(root.querySelectorAll<E>(selector)),
      rerender: async () => this.#renderSelectedDemoContent(),
    };
    return environment;
  }

  async #initializeOutputs(definition: TDemoDefinition, environment: TDemoEnvironment) {
    const toast = this.renderRoot.querySelector<TjDemoToast>('#toast');
    if (!toast) return;

    for (const item of this.#getOutputItems(definition)) {
      const value = await this.#readOutputValue(item, environment);
      if (item.id) {
        this.#outputValues.set(item.id, value);
        this.#initialOutputValues.set(item.id, value);
      }
      this.#logOutput(toast, item, value);
    }
  }

  async #refreshOutputs(definition: TDemoDefinition, environment: TDemoEnvironment, toast: TjDemoToast, id?: string) {
    for (const item of this.#getOutputItems(definition)) {
      if (id && item.id !== id) continue;
      const value = await this.#readOutputValue(item, environment);
      if (item.id) this.#outputValues.set(item.id, value);
      this.#logOutput(toast, item, value);
    }
  }

  #getOutputItems(definition: TDemoDefinition) {
    return this.#flattenActionBarItems(definition.actionBar?.items ?? []).filter((item) => item.type === 'output');
  }

  #flattenActionBarItems(items: readonly TDemoActionBarItem[]): TDemoActionBarItem[] {
    return items.flatMap((item) =>
      item.type === 'group' ? [item, ...this.#flattenActionBarItems(item.items ?? [])] : [item],
    );
  }

  async #readOutputValue(item: TDemoActionBarItem, environment: TDemoEnvironment) {
    return typeof item.value === 'function' ? item.value(environment) : item.value;
  }

  #logOutput(toast: TjDemoToast, item: TDemoActionBarItem, value: unknown) {
    if (item.label) toast.log(`${item.label}:`, value);
    else toast.log(value);
  }

  async #runDemoCleanup() {
    const cleanup = this.#demoCleanup;
    this.#demoCleanup = undefined;
    await cleanup?.();
  }

  #syncControls(renderer: HTMLElement, definition: TDemoDefinition, environment: TDemoEnvironment) {
    let controls = renderer.querySelector<TjDemoControls>(':scope > tj-demo-controls[data-viewer-controls]');
    const customControls = Array.from(this.querySelectorAll(':scope > [slot="controls"]'));
    const hasControls = Boolean(
      definition.controls?.length ||
      this.#hasActionBarControls(definition.actionBar?.items ?? []) ||
      definition.controls_raw_html ||
      customControls.length ||
      controls?.querySelector(':scope > [slot="controls"]:not([data-generated-controls])'),
    );

    if (!hasControls) {
      controls?.remove();
      return null;
    }

    if (!controls) {
      controls = document.createElement('tj-demo-controls') as TjDemoControls;
      controls.slot = 'controls';
      controls.dataset['viewerControls'] = '';
      renderer.append(controls);
    }

    controls.hidden = false;
    controls.data = definition.controls ?? [];
    controls.actionBar = definition.actionBar;
    controls.environment = environment;
    controls.sourceInfo = definition.sourceInfo;
    controls.append(...customControls);

    if (definition.controls_raw_html) {
      const wrapper = document.createElement('div');
      wrapper.slot = 'controls';
      wrapper.dataset['generatedControls'] = '';
      wrapper.innerHTML = definition.controls_raw_html;
      controls.append(wrapper);
    }

    return controls;
  }

  #hasActionBarControls(items: readonly TDemoActionBarItem[]): boolean {
    return items.some((item) =>
      item.type === 'group' ? this.#hasActionBarControls(item.items ?? []) : item.type !== 'output',
    );
  }

  #clearGeneratedControls(renderer: HTMLElement) {
    for (const element of Array.from(renderer.querySelectorAll('[data-generated-controls]'))) {
      element.remove();
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-viewer')) {
  customElements.define('tj-demo-viewer', TjDemoViewer);
}
