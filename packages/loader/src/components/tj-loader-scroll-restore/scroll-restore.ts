import { ScrollHandler } from '../../lib/scroll-handler';

/**
 * Restore document scroll after tj-loader has made client-rendered content visible.
 *
 * @example
 * <tj-loader></tj-loader>
 * <tj-loader-scroll-restore></tj-loader-scroll-restore>
 * <tj-loader-scroll-restore observe-scroll-element="#content"></tj-loader-scroll-restore>
 */
export class LoaderScrollRestoreElement extends HTMLElement {
  #controller: AbortController | null = null;
  #handler: ScrollHandler | null = null;

  #debug(...args: unknown[]) {
    if (this.hasAttribute('debug')) console.debug('tj-loader-scroll-restore:', ...args);
  }

  connectedCallback() {
    if (this.#controller) return;
    this.#controller = new AbortController();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    void this.#start(this.#controller);
  }

  disconnectedCallback() {
    this.#controller?.abort();
    this.#controller = null;
    window.removeEventListener('hashchange', this.#onHashChange);
    this.#handler?.disconnectEventListener();
    this.#handler = null;
  }

  #waitFor(target: EventTarget, name: string, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      target.addEventListener(name, () => resolve(), { once: true, signal });
      signal.addEventListener('abort', () => resolve(), { once: true });
    });
  }

  #onHashChange = () => {
    this.#handler?.scrollToHash('auto');
  };

  async #start(controller: AbortController) {
    const { signal } = controller;
    if (document.readyState === 'loading') {
      this.#debug('Waiting for DOMContentLoaded');
      await this.#waitFor(document, 'DOMContentLoaded', signal);
    }
    if (signal.aborted) return;

    const loader = document.querySelector('tj-loader');
    if (loader) {
      if (window.tj_loader_state !== 'visual') {
        this.#debug('Waiting for loader:visual');
        await this.#waitFor(loader, 'loader:visual', signal);
      }
    } else if (document.readyState !== 'complete') {
      this.#debug('Waiting for window load (no tj-loader found)');
      await this.#waitFor(window, 'load', signal);
    }
    if (signal.aborted) return;

    // Let the visible layout commit before reading anchor geometry or scroll height.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (signal.aborted) return;

    const selector = this.getAttribute('observe-scroll-element');
    const scrollElement = selector ? document.querySelector<HTMLElement>(selector) : window;
    if (!scrollElement) {
      console.warn(`tj-loader-scroll-restore: '${selector}' did not match a scroll element.`);
      return;
    }
    this.#debug('Restoring scroll position', selector || 'window');
    this.#handler = new ScrollHandler(scrollElement, 'scroll-position1', (...args) => this.#debug(...args));
    this.#handler.restoreScrollPosition();
    this.#handler.connectEventListener();
    window.addEventListener('hashchange', this.#onHashChange);
  }
}

if (customElements.get('tj-loader-scroll-restore')) {
  console.error('tj-loader-scroll-restore is already defined. Please check for duplicate imports.');
} else {
  customElements.define('tj-loader-scroll-restore', LoaderScrollRestoreElement);
}
