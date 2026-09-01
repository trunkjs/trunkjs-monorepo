import { LitElement, html, unsafeCSS } from 'lit';

import type {
  TDemoControlItem,
  TDemoControlsDefinition,
  TDemoCodeHandler,
  TDemoCodeSnippet,
  TDemoEnvironment,
  TDemoSourceInfo,
} from '../../types';
import baseControlStyle from './controls.scss?inline';
import style from './tj-demo-controls.scss?inline';

const OPEN_STORAGE_KEY = 'tj-demo-controls:open';

export class TjDemoControls extends LitElement {
  static override properties = {
    controls: { attribute: false },
    environment: { attribute: false },
    sourceInfo: { attribute: false },
    controlsOpen: { state: true },
    hasCustomControls: { state: true },
    selectedCode: { state: true },
  };

  static override styles = [unsafeCSS(baseControlStyle), unsafeCSS(style)];

  declare controls?: TDemoControlsDefinition;
  declare environment?: TDemoEnvironment;
  declare sourceInfo?: TDemoSourceInfo;
  controlsOpen = true;
  hasCustomControls = false;
  selectedCode?: { controlLabel: string; handler: TDemoCodeHandler; snippet: TDemoCodeSnippet };

  #codeTrigger?: HTMLElement;
  #elements = new Map<string, HTMLElement>();
  #initialValues = new Map<string, unknown>();

  constructor() {
    super();
    this.controlsOpen = this.#readOpenState();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    if (
      changedProperties.has('controls') ||
      changedProperties.has('environment') ||
      changedProperties.has('sourceInfo')
    ) {
      this.#renderBuiltinControls();
    }

    if (changedProperties.has('controlsOpen')) {
      this.#writeOpenState();
    }
  }

  override render() {
    return html`
      <div class=${this.#getShellClass()} ?hidden=${!this.#hasAnyControls()}>
        <div class="rail">
          <button
            class="toggle"
            type="button"
            aria-controls="controls-panel"
            aria-expanded=${String(this.controlsOpen)}
            @click=${this.#toggleOpen}
          >
            <span class="label">Do something</span>
            <span class="toggle-icon" aria-hidden="true">${this.controlsOpen ? '▴' : '▾'}</span>
          </button>
          <div class="actions">
            <slot name="controls-actions"></slot>
          </div>
        </div>

        <div id="controls-panel" class="panel-wrapper">
          <div class="panel" ?hidden=${!this.controlsOpen}>
            <div class="panel-content">
              <div id="builtin-controls" class="controls-builtins"></div>
              <div class=${this.hasCustomControls ? 'slot-wrap' : 'slot-wrap hidden'}>
                <slot name="controls" @slotchange=${this.#onControlsSlotChange}></slot>
              </div>
            </div>
          </div>
        </div>
      </div>
      <dialog class="code-dialog" @close=${this.#onCodeDialogClose}>
        <header class="code-dialog-header">
          <div>
            <strong>${this.selectedCode?.controlLabel ?? 'Control code'}</strong>
            <div class="code-dialog-meta">
              ${this.selectedCode?.handler ?? ''}${this.selectedCode ? ` · ${this.selectedCode.snippet.language}` : ''}
            </div>
          </div>
          <button type="button" class="dialog-close" aria-label="Close code dialog" @click=${this.#closeCodeDialog}>×</button>
        </header>
        <pre><code>${this.selectedCode?.snippet.code ?? ''}</code></pre>
        <footer class="code-dialog-footer">
          <button type="button" @click=${this.#copySelectedCode}>Copy</button>
          <button type="button" @click=${this.#closeCodeDialog}>Close</button>
        </footer>
      </dialog>
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
    return this.#hasBuiltinControls(this.controls?.items ?? []) || this.hasCustomControls;
  }

  #hasBuiltinControls(items: readonly TDemoControlItem[]): boolean {
    return items.some((item) =>
      item.type === 'group' ? this.#hasBuiltinControls(item.items ?? []) : item.type !== 'output',
    );
  }

  #renderBuiltinControls() {
    const target = this.renderRoot.querySelector('#builtin-controls');
    if (!(target instanceof HTMLElement)) {
      return;
    }

    target.replaceChildren();
    this.#elements.clear();
    this.#initialValues.clear();

    if (this.environment && this.controls?.items.length) {
      const items = document.createElement('div');
      items.className = this.controls.layout === 'columns' ? 'control-items layout-columns' : 'control-items';
      for (const [index, item] of this.controls.items.entries()) {
        const element = this.#createControlItem(item, String(index));
        if (element) items.append(element);
      }
      if (items.childElementCount) target.append(items);
    }
  }

  #createControlItem(item: TDemoControlItem, path: string): HTMLElement | null {
    const type = item.type ?? 'button';
    if (type === 'output') return null;
    if (type === 'group') {
      const content = document.createElement('div');
      content.className = 'action-group-content';
      for (const [index, child] of (item.items ?? []).entries()) {
        const element = this.#createControlItem(child, `${path}.${index}`);
        if (element) content.append(element);
      }
      if (!content.childElementCount) return null;

      const group = document.createElement('fieldset');
      group.dataset['tjDemoGroup'] = '';
      if (item.label) {
        const legend = document.createElement('legend');
        legend.textContent = item.label;
        group.append(legend);
      }
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
    const codeControl = this.#createCodeControl(item, path);
    if (codeControl) field.append(codeControl);
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
    if (type !== 'button') return field;
    if (!codeControl) return element;
    const splitAction = document.createElement('span');
    splitAction.className = 'split-action';
    splitAction.append(element, codeControl);
    return splitAction;
  }

  #createCodeControl(item: TDemoControlItem, path: string): HTMLElement | undefined {
    const snippets = this.sourceInfo?.controls?.[item.id ?? path];
    const entries = Object.entries(snippets ?? {}).filter(
      (entry): entry is [TDemoCodeHandler, TDemoCodeSnippet] => Boolean(entry[1]?.code),
    );
    if (!entries.length) return undefined;

    if (entries.length === 1) {
      const [handler, snippet] = entries[0];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'code-button';
      button.title = 'Show code';
      button.setAttribute('aria-label', 'Show code');
      button.append(this.#createCodeIcon());
      button.addEventListener('click', () => this.#openCodeDialog(item.label, handler, snippet, button));
      return button;
    }

    const details = document.createElement('details');
    details.className = 'code-menu';
    const summary = document.createElement('summary');
    summary.title = 'Select code';
    summary.setAttribute('aria-label', 'Select code');
    summary.append(this.#createCodeIcon());
    const chevron = document.createElement('span');
    chevron.className = 'code-chevron';
    chevron.textContent = '▾';
    chevron.setAttribute('aria-hidden', 'true');
    summary.append(chevron);
    details.append(summary);
    const menu = document.createElement('span');
    menu.className = 'code-menu-items';
    for (const [handler, snippet] of entries) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = handler;
      button.addEventListener('click', () => {
        details.open = false;
        this.#openCodeDialog(item.label, handler, snippet, summary);
      });
      menu.append(button);
    }
    details.append(menu);
    return details;
  }

  #createCodeIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'm8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14');
    svg.append(path);
    return svg;
  }

  #openCodeDialog(label: string | undefined, handler: TDemoCodeHandler, snippet: TDemoCodeSnippet, trigger: HTMLElement) {
    this.#codeTrigger = trigger;
    this.selectedCode = { controlLabel: label || 'Control', handler, snippet };
    void this.updateComplete.then(() => {
      const dialog = this.renderRoot.querySelector<HTMLDialogElement>('.code-dialog');
      if (dialog && !dialog.open) dialog.showModal();
    });
  }

  #closeCodeDialog = () => this.renderRoot.querySelector<HTMLDialogElement>('.code-dialog')?.close();
  #onCodeDialogClose = () => {
    this.selectedCode = undefined;
    this.#codeTrigger?.focus();
    this.#codeTrigger = undefined;
  };
  #copySelectedCode = async () => {
    if (this.selectedCode) await navigator.clipboard.writeText(this.selectedCode.snippet.code);
  };

  #createActionElement(item: TDemoControlItem, type: NonNullable<TDemoControlItem['type']>) {
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
    } else if (type === 'textarea' || type === 'json') {
      const textarea = document.createElement('textarea');
      textarea.readOnly = Boolean(item.readonly) || (type === 'json' && item.editable === false);
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
    for (const [name, value] of Object.entries(item.attributes ?? {})) element.setAttribute(name, value);
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
    item: TDemoControlItem,
    element: HTMLElement,
    event: Event,
    type: NonNullable<TDemoControlItem['type']>,
  ) {
    if (type === 'json' && item.update === 'change')
      return this.#applyJson(item, element as HTMLTextAreaElement, event);
    await item.onChange?.(this.#event(element, event, type), this.#environment());
  }

  async #handleInput(
    item: TDemoControlItem,
    element: HTMLElement,
    event: Event,
    type: NonNullable<TDemoControlItem['type']>,
  ) {
    const run = async () => {
      await item.onInput?.(this.#event(element, event, type), this.#environment());
      if (type === 'json' && item.update === 'input')
        await this.#applyJson(item, element as HTMLTextAreaElement, event);
    };
    if (item.debounce) window.setTimeout(() => void run(), item.debounce);
    else await run();
  }

  async #applyJson(item: TDemoControlItem, element: HTMLTextAreaElement, originalEvent: Event) {
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

  #event(element: HTMLElement, originalEvent: Event, type: NonNullable<TDemoControlItem['type']>) {
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
  async #loadItemValue(item: TDemoControlItem, element: HTMLElement, remember: boolean) {
    const value = typeof item.value === 'function' ? await item.value(this.#environment()) : item.value;
    if (remember && item.id) this.#initialValues.set(item.id, value);
    this.#writeElementValue(element, value, item.type);
  }
  #writeElementValue(element: HTMLElement, value: unknown, type?: TDemoControlItem['type']) {
    if (type === 'checkbox') (element as HTMLInputElement).checked = Boolean(value);
    else if (type === 'json') (element as HTMLTextAreaElement).value = JSON.stringify(value ?? null, null, 2);
    else (element as HTMLInputElement).value = value == null ? '' : String(value);
  }
  getValue<T = unknown>(id: string): T {
    const element = this.#elements.get(id);
    if (!element) throw new Error(`Control item not found: ${id}`);
    const type = element.closest<HTMLElement>('[data-tj-demo-field]')?.dataset[
      'tjDemoField'
    ] as TDemoControlItem['type'];
    return this.#event(element, new Event('read'), type ?? 'input').value as T;
  }
  setValue(id: string, value: unknown) {
    const element = this.#elements.get(id);
    if (!element) throw new Error(`Control item not found: ${id}`);
    const type = element.closest<HTMLElement>('[data-tj-demo-field]')?.dataset[
      'tjDemoField'
    ] as TDemoControlItem['type'];
    this.#writeElementValue(element, value, type);
  }
  async refresh(id?: string) {
    for (const item of this.#flattenItems(this.controls?.items ?? [])) {
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
  #flattenItems(items: readonly TDemoControlItem[]): TDemoControlItem[] {
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
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-controls')) {
  customElements.define('tj-demo-controls', TjDemoControls);
}
