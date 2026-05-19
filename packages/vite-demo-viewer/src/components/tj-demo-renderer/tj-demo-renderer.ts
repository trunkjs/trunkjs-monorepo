import { LitElement, html } from 'lit';

import type { TDemoDefinition } from '../../types';

export class TjDemoRenderer extends LitElement {
  override render() {
    return html`<slot></slot>`;
  }

  async showDemo(demo: TDemoDefinition) {
    this.replaceChildren();

    const cssEntries = this.#normalizeCss(demo.css);
    for (const cssEntry of cssEntries) {
      this.append(this.#createStyleNode(cssEntry));
    }

    const contentRoot = document.createElement('div');
    this.append(contentRoot);

    if (typeof demo.render === 'function') {
      await demo.render(contentRoot);
      return;
    }

    if (demo.wrapper_html && typeof demo.wrapper_html === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = demo.wrapper_html.replace('{{content}}', demo.html ?? '');
      contentRoot.append(...Array.from(wrapper.childNodes));
      return;
    }

    if (demo.html) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = demo.html;
      contentRoot.append(...Array.from(wrapper.childNodes));
      return;
    }

    contentRoot.textContent = 'Demo exportiert keine render(root)-Funktion';
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
    const cssList = Array.isArray(css) ? css : css ? [css] : [];
    return cssList
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-demo-renderer')) {
  customElements.define('tj-demo-renderer', TjDemoRenderer);
}
