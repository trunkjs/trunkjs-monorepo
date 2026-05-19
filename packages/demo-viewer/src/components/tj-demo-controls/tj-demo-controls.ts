import { LitElement, html, unsafeCSS } from 'lit';

import type { TControlDefinition } from '../../types';
import baseControlStyle from './controls.scss?inline';
import style from './tj-demo-controls.scss?inline';

const OPEN_STORAGE_KEY = 'tj-demo-controls:open';

export class TjDemoControls extends LitElement {
  static override properties = {
    data: { attribute: false },
    controlsOpen: { state: true },
    hasCustomControls: { state: true },
  };

  static override styles = [unsafeCSS(baseControlStyle), unsafeCSS(style)];

  declare data?: readonly TControlDefinition[];
  controlsOpen = true;
  hasCustomControls = false;

  #resizeObserver?: ResizeObserver;

  constructor() {
    super();
    this.controlsOpen = this.#readOpenState();
  }

  override connectedCallback() {
    super.connectedCallback();
    this.#startResizeObserver();
    this.#applyDocumentPadding();
    this.#updateBodyAlignment();
    window.addEventListener('resize', this.#onViewportChange);
  }

  override disconnectedCallback() {
    window.removeEventListener('resize', this.#onViewportChange);
    this.#resizeObserver?.disconnect();
    this.#clearDocumentPadding();
    this.#clearBodyAlignment();
    super.disconnectedCallback();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (changedProperties.has('data')) {
      this.#renderBuiltinControls();
    }

    if (changedProperties.has('controlsOpen')) {
      this.#writeOpenState();
      this.#applyDocumentPadding();
      this.#updateBodyAlignment();
    }
  }

  override render() {
    return html`
      <div class=${this.#getShellClass()} ?hidden=${!this.#hasAnyControls()}>
        <div class="panel-wrapper">
          <div class="panel" ?hidden=${!this.controlsOpen}>
            <div class="panel-content">
              <div id="builtin-controls" class="controls-builtins"></div>
              <div class=${this.hasCustomControls ? 'slot-wrap' : 'slot-wrap hidden'}>
                <slot name="controls" @slotchange=${this.#onControlsSlotChange}></slot>
              </div>
            </div>
          </div>
        </div>

        <div class="rail">
          <button
            class="toggle"
            type="button"
            aria-label=${this.controlsOpen ? 'Controls einklappen' : 'Controls ausklappen'}
            aria-expanded=${String(this.controlsOpen)}
            @click=${this.#toggleOpen}
          >
            <span class="toggle-icon" aria-hidden="true">${this.controlsOpen ? '▾' : '▴'}</span>
          </button>

          <div class="label">Controls</div>
          <div class="actions">
            <slot name="controls-actions"></slot>
          </div>
        </div>
      </div>
    `;
  }

  override firstUpdated() {
    this.#syncCustomControlsState();
    this.#renderBuiltinControls();
  }

  #toggleOpen = () => {
    this.controlsOpen = !this.controlsOpen;
  };

  #getShellClass() {
    const stateClass = this.controlsOpen ? 'is-open' : 'is-closed';
    return `shell ${stateClass}`;
  }

  #onControlsSlotChange = () => {
    this.#syncCustomControlsState();
    this.requestUpdate();
  };

  #syncCustomControlsState() {
    const slot = this.renderRoot.querySelector('slot[name="controls"]');
    if (!(slot instanceof HTMLSlotElement)) {
      this.hasCustomControls = false;
      return;
    }

    this.hasCustomControls = slot
      .assignedNodes({ flatten: true })
      .some((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
  }

  #hasAnyControls() {
    return Boolean(this.data?.length) || this.hasCustomControls;
  }

  #renderBuiltinControls() {
    const target = this.renderRoot.querySelector('#builtin-controls');
    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.replaceChildren();

    for (const control of this.data ?? []) {
      target.append(this.#createControlElement(control));
    }

    this.#updatePanelHeight();
  }

  #createControlElement(control: TControlDefinition) {
    const element =
      control.element instanceof HTMLElement
        ? control.element
        : document.createElement(typeof control.element === 'string' ? control.element : 'button');

    element.setAttribute('data-tj-demo-control', '');
    element.textContent = control.label ?? '';

    if (control.info && !element.getAttribute('title')) {
      element.title = control.info;
    }

    if (element instanceof HTMLSelectElement && Array.isArray(control.selectOptions)) {
      element.replaceChildren();

      for (const optionDefinition of control.selectOptions) {
        const option = document.createElement('option');

        if (typeof optionDefinition === 'string') {
          option.value = optionDefinition;
          option.textContent = optionDefinition;
        } else {
          option.value = optionDefinition.value ?? optionDefinition.label ?? '';
          option.textContent = optionDefinition.label ?? optionDefinition.value ?? '';
          option.disabled = Boolean(optionDefinition.disabled);
        }

        element.append(option);
      }
    }

    for (const [key, handler] of Object.entries(control)) {
      if (!key.startsWith('on') || typeof handler !== 'function') {
        continue;
      }

      const eventName = key.slice(2);
      if (!eventName) {
        continue;
      }

      element.addEventListener(eventName, handler as EventListener);
    }

    if (control.events && typeof control.events === 'object') {
      for (const [eventName, handler] of Object.entries(control.events)) {
        if (typeof handler === 'function') {
          element.addEventListener(eventName, handler as EventListener);
        }
      }
    }

    if (typeof control.init === 'function') {
      void control.init(element);
    }

    return element;
  }

  #readOpenState() {
    if (typeof sessionStorage === 'undefined') {
      return true;
    }

    try {
      const raw = sessionStorage.getItem(OPEN_STORAGE_KEY);
      if (raw === null) {
        return true;
      }

      return raw === 'true';
    } catch {
      return true;
    }
  }

  #writeOpenState() {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(OPEN_STORAGE_KEY, String(this.controlsOpen));
    } catch {
      /* ignore storage errors */
    }
  }

  #startResizeObserver() {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.#resizeObserver?.disconnect();
    this.#resizeObserver = new ResizeObserver(() => {
      this.#updatePanelHeight();
      this.#applyDocumentPadding();
      this.#updateBodyAlignment();
    });
    this.#resizeObserver.observe(this);

    if (typeof document !== 'undefined') {
      this.#resizeObserver.observe(document.documentElement);
      if (document.body) {
        this.#resizeObserver.observe(document.body);
      }
    }
  }

  #updatePanelHeight() {
    const panel = this.renderRoot.querySelector('.panel') as HTMLElement | null;
    const height = panel?.scrollHeight ?? 0;
    this.style.setProperty('--tj-demo-controls-panel-height', `${height}px`);
  }

  #applyDocumentPadding() {
    if (typeof document === 'undefined') {
      return;
    }

    requestAnimationFrame(() => {
      document.documentElement.style.paddingBottom = `${this.getBoundingClientRect().height}px`;
    });
  }

  #clearDocumentPadding() {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.style.paddingBottom = '';
  }

  #updateBodyAlignment() {
    if (typeof document === 'undefined') {
      return;
    }

    const body = document.body;
    if (!body) {
      return;
    }

    requestAnimationFrame(() => {
      const rect = body.getBoundingClientRect();
      this.style.left = `${rect.left}px`;
      this.style.width = `${rect.width}px`;
    });
  }

  #clearBodyAlignment() {
    this.style.left = '';
    this.style.width = '';
  }

  #onViewportChange = () => {
    this.#updateBodyAlignment();
    this.#applyDocumentPadding();
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-controls')) {
  customElements.define('tj-demo-controls', TjDemoControls);
}
