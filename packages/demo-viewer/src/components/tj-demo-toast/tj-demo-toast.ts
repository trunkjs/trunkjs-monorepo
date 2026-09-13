import { LitElement, html, nothing, unsafeCSS } from 'lit';

import type { TDemoToastOptions } from '../../types';
import style from './tj-demo-toast.scss?inline';

type ToastEntry = {
  id: number;
  message: string;
  title?: string;
};

type LogEntry = {
  id: number;
  level: 'log' | 'error';
  text: string;
};

export class TjDemoToast extends LitElement {
  static override properties = {
    toasts: { state: true },
    logs: { state: true },
  };

  static override styles = [unsafeCSS(style)];

  static #instances = new Set<TjDemoToast>();
  static #consolePatched = false;
  static #originalConsoleLog = console.log;
  static #originalConsoleError = console.error;
  static #nextId = 0;

  private toasts: ToastEntry[] = [];
  private logs: LogEntry[] = [];

  override connectedCallback() {
    super.connectedCallback();
    TjDemoToast.#instances.add(this);
    TjDemoToast.#patchConsole();
  }

  override disconnectedCallback() {
    TjDemoToast.#instances.delete(this);
    TjDemoToast.#unpatchConsole();
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <section class="stack" aria-label="Demo notifications">
        ${this.toasts.map(
          (toast) => html`
            <article class="toast" data-toast-id=${toast.id} role="status" @animationend=${this.#onToastAnimationEnd}>
              <button class="close" type="button" aria-label="Toast schließen" @click=${() => this.dismiss(toast.id)}>
                ×
              </button>
              ${toast.title ? html`<strong class="title">${toast.title}</strong>` : nothing}
              <div class="message">${toast.message}</div>
            </article>
          `,
        )}
        ${
          this.logs.length
            ? html`
                <article class="toast logging-toast" role="log" aria-label="Demo log output">
                  <button class="close" type="button" aria-label="Logging schließen" @click=${this.clearLog}>×</button>
                  <strong class="title">Log</strong>
                  <pre class="log-output"><code>${this.logs.map(
                    (entry) => html`<span class=${entry.level}>${entry.text}</span>`,
                  )}</code></pre>
                </article>
              `
            : nothing
        }
      </section>
    `;
  }

  show(message: unknown, options: TDemoToastOptions = {}) {
    const id = ++TjDemoToast.#nextId;
    this.toasts = [...this.toasts, { id, message: this.#formatValue(message), title: options.title }];
    return id;
  }

  log(...values: unknown[]) {
    this.#appendLog('log', values);
  }

  dismiss(id: number) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
  }

  clearLog = () => {
    this.logs = [];
  };

  #appendLog(level: LogEntry['level'], values: readonly unknown[]) {
    const text = values.map((value) => this.#formatValue(value)).join(' ');
    this.logs = [...this.logs, { id: ++TjDemoToast.#nextId, level, text }];
    void this.updateComplete.then(() => {
      const output = this.renderRoot.querySelector('.log-output');
      if (output instanceof HTMLElement) output.scrollTop = output.scrollHeight;
    });
  }

  #formatValue(value: unknown): string {
    if (typeof value === 'string') return value;
    if (value instanceof Error) return value.stack || value.message || value.name;

    try {
      const serialized = JSON.stringify(value, null, 2);
      return serialized === undefined ? String(value) : serialized;
    } catch {
      return String(value);
    }
  }

  #onToastAnimationEnd = (event: AnimationEvent) => {
    if (event.animationName !== 'tj-demo-toast-lifetime') return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const id = Number(target.dataset['toastId']);
    if (Number.isFinite(id)) this.dismiss(id);
  };

  static #patchConsole() {
    if (this.#consolePatched) return;

    console.log = (...values: unknown[]) => {
      this.#originalConsoleLog(...values);
      for (const instance of this.#instances) instance.#appendLog('log', values);
    };
    console.error = (...values: unknown[]) => {
      this.#originalConsoleError(...values);
      for (const instance of this.#instances) instance.#appendLog('error', values);
    };
    this.#consolePatched = true;
  }

  static #unpatchConsole() {
    if (this.#instances.size || !this.#consolePatched) return;
    console.log = this.#originalConsoleLog;
    console.error = this.#originalConsoleError;
    this.#consolePatched = false;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-toast')) {
  customElements.define('tj-demo-toast', TjDemoToast);
}
