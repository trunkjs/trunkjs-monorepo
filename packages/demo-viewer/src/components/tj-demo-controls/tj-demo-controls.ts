import { LitElement, html, unsafeCSS } from 'lit';

import type { TControlDefinition, TDemoActionBarDefinition, TDemoActionBarItem, TDemoEnvironment } from '../../types';
import baseControlStyle from './controls.scss?inline';
import style from './tj-demo-controls.scss?inline';

const OPEN_STORAGE_KEY = 'tj-demo-controls:open';

export class TjDemoControls extends LitElement {
  static override properties = {
    data: { attribute: false },
    actionBar: { attribute: false },
    environment: { attribute: false },
    controlsOpen: { state: true },
    hasCustomControls: { state: true },
  };

  static override styles = [unsafeCSS(baseControlStyle), unsafeCSS(style)];

  declare data?: readonly TControlDefinition[];
  declare actionBar?: TDemoActionBarDefinition;
  declare environment?: TDemoEnvironment;
  controlsOpen = true;
  hasCustomControls = false;

  #resizeObserver?: ResizeObserver;
  #elements = new Map<string, HTMLElement>();
  #initialValues = new Map<string, unknown>();

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

    if (changedProperties.has('data') || changedProperties.has('actionBar') || changedProperties.has('environment')) {
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
    return Boolean(this.data?.length) || Boolean(this.actionBar?.items.length) || this.hasCustomControls;
  }

  #renderBuiltinControls() {
    const target = this.renderRoot.querySelector('#builtin-controls');
    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.replaceChildren();
    this.#elements.clear();
    this.#initialValues.clear();

    if (this.data?.length) {
      const legacy = document.createElement('div');
      legacy.className = 'legacy-controls';
      for (const control of this.data) legacy.append(this.#createControlElement(control));
      target.append(legacy);
    }
    if (this.environment && this.actionBar?.items.length) {
      const items = document.createElement('div');
      items.className = this.actionBar.layout === 'columns' ? 'action-bar-items layout-columns' : 'action-bar-items';
      for (const item of this.actionBar.items) items.append(this.#createActionBarItem(item));
      target.append(items);
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

  #createActionBarItem(item: TDemoActionBarItem): HTMLElement {
    const type = item.type ?? 'button';
    if (type === 'group') {
      const group = document.createElement('fieldset');
      group.dataset['tjDemoGroup'] = '';
      if (item.label) {
        const legend = document.createElement('legend');
        legend.textContent = item.label;
        group.append(legend);
      }
      const content = document.createElement('div');
      content.className = 'action-group-content';
      for (const child of item.items ?? []) content.append(this.#createActionBarItem(child));
      group.append(content);
      return group;
    }
    if (type === 'html') {
      const content = document.createElement('div');
      content.innerHTML = item.html ?? '';
      return content;
    }
    if (type === 'custom') return item.create?.(this.#environment()) ?? document.createElement('span');

    const field = document.createElement('label');
    field.dataset['tjDemoField'] = type;
    if (item.label && type !== 'button') {
      const label = document.createElement('span');
      label.className = 'field-label';
      label.textContent = item.label;
      field.append(label);
    }
    const element = this.#createActionElement(item, type);
    field.append(element);
    if (item.info) element.title = item.info;
    if (item.id) this.#elements.set(item.id, element);

    if (type === 'json' && item.editable !== false && !item.readonly && (item.update ?? 'apply') === 'apply') {
      const actions = document.createElement('span');
      actions.className = 'field-actions';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.textContent = 'Anwenden';
      apply.addEventListener('click', (event) => void this.#applyJson(item, element as HTMLTextAreaElement, event));
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.textContent = 'Zurücksetzen';
      reset.addEventListener('click', () => void this.reset(item.id));
      actions.append(apply, reset);
      field.append(actions);
    }
    if (item.id) {
      const error = document.createElement('span');
      error.className = 'field-error';
      error.dataset['errorFor'] = item.id;
      error.hidden = true;
      field.append(error);
    }
    void this.#loadItemValue(item, element, true);
    return type === 'button' ? element : field;
  }

  #createActionElement(item: TDemoActionBarItem, type: NonNullable<TDemoActionBarItem['type']>) {
    let element: HTMLElement;
    if (type === 'select') {
      const select = document.createElement('select');
      for (const definition of item.options ?? []) {
        const option = document.createElement('option');
        if (typeof definition === 'string') option.value = option.textContent = definition;
        else {
          option.value = definition.value ?? definition.label ?? '';
          option.textContent = definition.label ?? definition.value ?? '';
          option.disabled = Boolean(definition.disabled);
        }
        select.append(option);
      }
      element = select;
    } else if (type === 'textarea' || type === 'json' || type === 'output') {
      const textarea = document.createElement('textarea');
      textarea.readOnly = type === 'output' || Boolean(item.readonly) || (type === 'json' && item.editable === false);
      textarea.spellcheck = false;
      element = textarea;
    } else if (type === 'checkbox') {
      const input = document.createElement('input');
      input.type = 'checkbox';
      element = input;
    } else if (type === 'input') {
      const input = document.createElement('input');
      input.readOnly = Boolean(item.readonly);
      element = input;
    } else {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.label ?? '';
      element = button;
    }
    element.dataset['tjDemoControl'] = '';
    if (item.onClick)
      element.addEventListener(
        'click',
        (event) => void item.onClick?.(this.#event(element, event, type), this.#environment()),
      );
    if (item.onChange || (type === 'json' && item.update === 'change'))
      element.addEventListener('change', (event) => void this.#handleChange(item, element, event, type));
    if (item.onInput || item.update === 'input')
      element.addEventListener('input', (event) => void this.#handleInput(item, element, event, type));
    return element;
  }

  async #handleChange(
    item: TDemoActionBarItem,
    element: HTMLElement,
    event: Event,
    type: NonNullable<TDemoActionBarItem['type']>,
  ) {
    if (type === 'json' && item.update === 'change')
      return this.#applyJson(item, element as HTMLTextAreaElement, event);
    await item.onChange?.(this.#event(element, event, type), this.#environment());
  }

  async #handleInput(
    item: TDemoActionBarItem,
    element: HTMLElement,
    event: Event,
    type: NonNullable<TDemoActionBarItem['type']>,
  ) {
    const run = async () => {
      await item.onInput?.(this.#event(element, event, type), this.#environment());
      if (type === 'json' && item.update === 'input')
        await this.#applyJson(item, element as HTMLTextAreaElement, event);
    };
    if (item.debounce) window.setTimeout(() => void run(), item.debounce);
    else await run();
  }

  async #applyJson(item: TDemoActionBarItem, element: HTMLTextAreaElement, originalEvent: Event) {
    try {
      const value: unknown = JSON.parse(element.value);
      const validation = await item.validate?.(value, this.#environment());
      if (typeof validation === 'string') throw new Error(validation);
      if (item.id) this.setError(item.id);
      await item.onApply?.({ element, value, originalEvent }, this.#environment());
      await item.onChange?.({ element, value, originalEvent }, this.#environment());
    } catch (error) {
      if (item.id) this.setError(item.id, error instanceof Error ? error.message : String(error));
    }
  }

  #event(element: HTMLElement, originalEvent: Event, type: NonNullable<TDemoActionBarItem['type']>) {
    let value: unknown = (element as HTMLInputElement).value;
    if (type === 'checkbox') value = (element as HTMLInputElement).checked;
    if (type === 'json') {
      try {
        value = JSON.parse((element as HTMLTextAreaElement).value);
      } catch {
        /* preserve invalid editor text */
      }
    }
    return { element, value, originalEvent };
  }
  #environment() {
    if (!this.environment) throw new Error('Demo environment is not available');
    return this.environment;
  }
  async #loadItemValue(item: TDemoActionBarItem, element: HTMLElement, remember: boolean) {
    const value = typeof item.value === 'function' ? await item.value(this.#environment()) : item.value;
    if (remember && item.id) this.#initialValues.set(item.id, value);
    this.#writeElementValue(element, value, item.type);
  }
  #writeElementValue(element: HTMLElement, value: unknown, type?: TDemoActionBarItem['type']) {
    if (type === 'checkbox') (element as HTMLInputElement).checked = Boolean(value);
    else if (type === 'json') (element as HTMLTextAreaElement).value = JSON.stringify(value ?? null, null, 2);
    else (element as HTMLInputElement).value = value == null ? '' : String(value);
  }
  getValue<T = unknown>(id: string): T {
    const element = this.#elements.get(id);
    if (!element) throw new Error(`Action bar item not found: ${id}`);
    const type = element.closest<HTMLElement>('[data-tj-demo-field]')?.dataset[
      'tjDemoField'
    ] as TDemoActionBarItem['type'];
    return this.#event(element, new Event('read'), type ?? 'input').value as T;
  }
  setValue(id: string, value: unknown) {
    const element = this.#elements.get(id);
    if (!element) throw new Error(`Action bar item not found: ${id}`);
    const type = element.closest<HTMLElement>('[data-tj-demo-field]')?.dataset[
      'tjDemoField'
    ] as TDemoActionBarItem['type'];
    this.#writeElementValue(element, value, type);
  }
  async refresh(id?: string) {
    for (const item of this.#flattenItems(this.actionBar?.items ?? [])) {
      if ((!id || item.id === id) && item.id) {
        const element = this.#elements.get(item.id);
        if (element) await this.#loadItemValue(item, element, false);
      }
    }
  }
  async reset(id?: string) {
    for (const [itemId, value] of this.#initialValues) if (!id || itemId === id) this.setValue(itemId, value);
  }
  setError(id: string, message?: string) {
    const error = this.renderRoot.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(id)}"]`);
    if (error) {
      error.textContent = message ?? '';
      error.hidden = !message;
    }
  }
  #flattenItems(items: readonly TDemoActionBarItem[]): TDemoActionBarItem[] {
    return items.flatMap((item) => (item.type === 'group' ? [item, ...this.#flattenItems(item.items ?? [])] : [item]));
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
