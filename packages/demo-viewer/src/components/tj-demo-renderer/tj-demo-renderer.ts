import { MarkdownDocument } from '@trunkjs/ast-markdown';
import { LitElement, css, html } from 'lit';

import type { TDemoDefinition } from '../../types';
import defaultStyle from './default-style.scss?inline';

export class TjDemoRenderer extends LitElement {
  static override styles = css`
    .error-indicator {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 10000;
      max-width: min(420px, calc(100vw - 24px));
      padding: 10px 12px;
      border: 1px solid #b91c1c;
      border-radius: 10px;
      background: #dc2626;
      color: #fff;
      box-shadow: 0 10px 30px rgba(127, 29, 29, 0.35);
      font: 12px/1.4 sans-serif;
      white-space: pre-wrap;
      word-break: break-word;
      pointer-events: none;
    }
  `;

  static #instances = new Set<TjDemoRenderer>();
  static #originalConsoleError = console.error;
  static #consolePatched = false;

  errorMessage = '';

  override connectedCallback() {
    super.connectedCallback();
    TjDemoRenderer.#instances.add(this);
    TjDemoRenderer.#patchConsoleError();
    window.addEventListener('error', this.#onWindowError);
    window.addEventListener('unhandledrejection', this.#onUnhandledRejection);
  }

  override disconnectedCallback() {
    window.removeEventListener('error', this.#onWindowError);
    window.removeEventListener('unhandledrejection', this.#onUnhandledRejection);
    TjDemoRenderer.#instances.delete(this);
    TjDemoRenderer.#unpatchConsoleError();
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <slot></slot>
      ${this.errorMessage ? html`<div class="error-indicator">${this.errorMessage}</div>` : null}
    `;
  }

  async showDemo(demo: TDemoDefinition) {
    this.errorMessage = '';
    this.requestUpdate();
    this.replaceChildren();

    const cssEntries = this.#normalizeCss(demo.css);
    for (const cssEntry of cssEntries) {
      this.append(this.#createStyleNode(cssEntry));
    }

    const contentRoot = document.createElement('div');
    contentRoot.className = 'tj-demo-renderer-content';
    this.append(contentRoot);

    try {
      if (typeof demo.render === 'function') {
        await demo.render(contentRoot);
        return;
      }

      if (demo.wrapper_html && typeof demo.wrapper_html === 'string') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = demo.wrapper_html.replace('{{content}}', this.#getStaticContentHtml(demo));
        contentRoot.append(...Array.from(wrapper.childNodes));
        return;
      }

      if (demo.markdown) {
        const markdownRoot = this.#renderMarkdown(demo.markdown);
        contentRoot.append(...Array.from(markdownRoot.childNodes));
        return;
      }

      if (demo.html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = demo.html;
        contentRoot.append(...Array.from(wrapper.childNodes));
        return;
      }

      contentRoot.textContent = 'Demo exportiert keine render(root)-Funktion';
    } catch (error) {
      const message = this.#formatError(error);
      this.#setError(message);
      contentRoot.textContent = message;
    }
  }

  #createStyleNode(cssEntry: string) {
    if (this.#isStylesheetHref(cssEntry)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssEntry;
      return link;
    }

    const style = document.createElement('style');
    style.textContent = cssEntry;
    return style;
  }

  #getStaticContentHtml(demo: TDemoDefinition) {
    if (typeof demo.markdown === 'string' && demo.markdown.length > 0) {
      return this.#renderMarkdown(demo.markdown).innerHTML;
    }

    return demo.html ?? '';
  }

  #renderMarkdown(markdown: string) {
    const markdownDocument = new MarkdownDocument();
    markdownDocument.markdown = markdown;
    return markdownDocument.getHTML();
  }

  #isStylesheetHref(value: string) {
    const trimmed = value.trim();

    if (!trimmed) {
      return false;
    }

    if (/[{};]/.test(trimmed) || trimmed.includes('\n')) {
      return false;
    }

    return /^(https?:\/\/|\/|\.\/|\.\.\/)/.test(trimmed) || /\.(css|scss|sass|less|styl|stylus)(\?|#|$)/.test(trimmed);
  }

  #normalizeCss(css: TDemoDefinition['css']): string[] {
    if (css === undefined) {
      return [defaultStyle];
    }

    if (css === null) {
      return [];
    }

    const cssList = Array.isArray(css) ? css : [css];

    return cssList
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .map((value) => (value === 'default' ? defaultStyle : value));
  }

  #setError(message: string) {
    this.errorMessage = message;
    this.requestUpdate();
  }

  #formatError(error: unknown) {
    if (error instanceof Error) {
      return error.message || error.name;
    }

    return String(error);
  }

  #onWindowError = (event: ErrorEvent) => {
    const message = event.error ? this.#formatError(event.error) : event.message;
    if (message) {
      this.#setError(message);
    }
  };

  #onUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.#setError(this.#formatError(event.reason));
  };

  static #patchConsoleError() {
    if (this.#consolePatched) {
      return;
    }

    console.error = (...args: unknown[]) => {
      this.#originalConsoleError(...args);

      const message = args
        .map((arg) => {
          if (arg instanceof Error) {
            return arg.message || arg.name;
          }

          if (typeof arg === 'string') {
            return arg;
          }

          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        })
        .filter(Boolean)
        .join(' ');

      if (!message) {
        return;
      }

      for (const instance of this.#instances) {
        instance.#setError(message);
      }
    };

    this.#consolePatched = true;
  }

  static #unpatchConsoleError() {
    if (this.#instances.size > 0 || !this.#consolePatched) {
      return;
    }

    console.error = this.#originalConsoleError;
    this.#consolePatched = false;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-renderer')) {
  customElements.define('tj-demo-renderer', TjDemoRenderer);
}
