import { MarkdownDocument } from '@trunkjs/ast-markdown';
import { LitElement, css, html } from 'lit';

import { getDemoViewHref, readDemoViewMode, type TDemoViewMode } from '../../lib/demoViewMode';
import type { TDemoCodeSnippet, TDemoDefinition } from '../../types';
import defaultStyle from './default-style.scss?inline';

export class TjDemoRenderer extends LitElement {
  static override properties = {
    viewMode: { attribute: 'view-mode', reflect: true },
  };

  static override styles = css`
    :host {
      display: block;
    }

    :host([view-mode='fullscreen']),
    :host([view-mode='source']) {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      overflow: auto;
      background: #fff;
    }

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

  errorMessage = '';
  viewMode: TDemoViewMode = 'default';

  override connectedCallback() {
    super.connectedCallback();
    this.viewMode = readDemoViewMode(window.location.search);
    window.addEventListener('error', this.#onWindowError);
    window.addEventListener('unhandledrejection', this.#onUnhandledRejection);
    window.addEventListener('keydown', this.#onKeyDown);
  }

  override disconnectedCallback() {
    window.removeEventListener('error', this.#onWindowError);
    window.removeEventListener('unhandledrejection', this.#onUnhandledRejection);
    window.removeEventListener('keydown', this.#onKeyDown);
    super.disconnectedCallback();
  }

  override render() {
    return html`
      <slot></slot>
      <slot name="controls"></slot>
      ${this.errorMessage ? html`<div class="error-indicator">${this.errorMessage}</div>` : null}
    `;
  }

  async showDemo(demo: TDemoDefinition): Promise<HTMLElement> {
    this.viewMode = readDemoViewMode(window.location.search);
    this.errorMessage = '';
    this.requestUpdate();
    const slottedChildren = Array.from(this.children).filter((child) => child.hasAttribute('slot'));
    this.replaceChildren(...slottedChildren);

    const cssEntries = this.viewMode === 'source' ? [defaultStyle] : this.#normalizeCss(demo.css);
    for (const cssEntry of cssEntries) {
      this.append(this.#createStyleNode(cssEntry));
    }

    const contentRoot = document.createElement('div');
    contentRoot.className = 'tj-demo-renderer-content';
    this.append(contentRoot);

    try {
      if (this.viewMode === 'source') {
        this.#renderSource(contentRoot, getDemoCodeSnippets(demo));
        return contentRoot;
      }

      if (typeof demo.render === 'function') {
        await demo.render(contentRoot);
        return contentRoot;
      }

      if (demo.wrapper_html && typeof demo.wrapper_html === 'string') {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = demo.wrapper_html.replace('{{content}}', this.#getStaticContentHtml(demo));
        contentRoot.append(...Array.from(wrapper.childNodes));
        return contentRoot;
      }

      if (demo.markdown) {
        const markdownRoot = this.#renderMarkdown(demo.markdown);
        contentRoot.append(...Array.from(markdownRoot.childNodes));
        return contentRoot;
      }

      if (demo.html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = demo.html;
        contentRoot.append(...Array.from(wrapper.childNodes));
        return contentRoot;
      }

      contentRoot.textContent = 'Demo exportiert keine render(root)-Funktion';
    } catch (error) {
      const message = this.#formatError(error);
      this.#setError(message);
      contentRoot.textContent = message;
    }
    return contentRoot;
  }

  #renderSource(contentRoot: HTMLElement, snippets: TDemoCodeSnippet[]) {
    contentRoot.classList.add('tj-demo-renderer-source');

    const pre = document.createElement('pre');
    const code = document.createElement('code');
    pre.append(code);

    const showSnippet = (snippet?: TDemoCodeSnippet) => {
      if (snippet) code.dataset['language'] = snippet.language;
      else delete code.dataset['language'];
      code.textContent = snippet?.code ?? 'Quellcode nicht verfügbar';
    };

    if (snippets.length > 1) {
      const tabs = document.createElement('nav');
      tabs.className = 'source-tabs';
      tabs.setAttribute('aria-label', 'Quellcode');
      tabs.setAttribute('role', 'tablist');

      snippets.forEach((snippet, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'source-tab';
        button.setAttribute('role', 'tab');
        button.textContent = snippet.label ?? snippet.language.toUpperCase();
        const select = () => {
          for (const tab of Array.from(tabs.querySelectorAll<HTMLElement>('[role="tab"]'))) {
            tab.setAttribute('aria-selected', 'false');
            tab.tabIndex = -1;
          }
          button.setAttribute('aria-selected', 'true');
          button.tabIndex = 0;
          showSnippet(snippet);
        };
        button.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
        button.tabIndex = index === 0 ? 0 : -1;
        button.addEventListener('click', select);
        tabs.append(button);
      });
      contentRoot.append(tabs);
    }

    showSnippet(snippets[0]);
    contentRoot.append(pre);
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

  #onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || this.viewMode === 'default') {
      return;
    }

    window.location.assign(getDemoViewHref(window.location.href, 'default'));
  };
}

export function getDemoCodeSnippet(demo: TDemoDefinition): TDemoCodeSnippet | undefined {
  if (typeof demo.html === 'string') return { code: demo.html, language: 'html', label: 'HTML' };
  if (typeof demo.markdown === 'string') return { code: demo.markdown, language: 'markdown', label: 'Markdown' };
  if (demo.sourceInfo?.example) return demo.sourceInfo.example;
  if (typeof demo.source === 'string') return { code: demo.source, language: 'ts', label: 'Full source' };
  return undefined;
}

export function getDemoCodeSnippets(demo: TDemoDefinition): TDemoCodeSnippet[] {
  const example = getDemoCodeSnippet(demo);
  return [...(example ? [example] : []), ...(demo.sourceInfo?.styles ?? [])];
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-renderer')) {
  customElements.define('tj-demo-renderer', TjDemoRenderer);
}
