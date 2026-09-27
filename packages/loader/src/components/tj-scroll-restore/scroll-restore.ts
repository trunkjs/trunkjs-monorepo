import { ScrollHandler } from '../../lib/scroll-handler';

/**
 * Restore document scroll after tj-loader has made client-rendered content visible.
 *
 * @example
 * <tj-loader></tj-loader>
 * <tj-scroll-restore></tj-scroll-restore>
 * <tj-scroll-restore observe-scroll-element="#content"></tj-scroll-restore>
 */
export class ScrollRestoreElement extends HTMLElement {
  #controller: AbortController | null = null;
  #handler: ScrollHandler | null = null;

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
    document.removeEventListener('click', this.#onDocumentClick);
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
    this.#handler?.scrollToHash('smooth');
  };

  #onDocumentClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
    const destination = new URL(anchor.href);
    const current = new URL(location.href);
    if (
      !destination.hash || destination.origin !== current.origin ||
      destination.pathname !== current.pathname || destination.search !== current.search ||
      !this.#handler?.hasHashTarget(destination.hash)
    ) return;

    event.preventDefault();
    history.pushState(history.state, '', destination.href);
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: current.href, newURL: destination.href }));
  };

  async #start(controller: AbortController) {
    const { signal } = controller;
    if (document.readyState === 'loading') await this.#waitFor(document, 'DOMContentLoaded', signal);
    if (signal.aborted) return;

    const loader = document.querySelector('tj-loader');
    if (loader) {
      if (window.tj_loader_state !== 'visual') await this.#waitFor(loader, 'loader:visual', signal);
    } else if (document.readyState !== 'complete') {
      await this.#waitFor(window, 'load', signal);
    }
    if (signal.aborted) return;

    // Let the visible layout commit before reading anchor geometry or scroll height.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (signal.aborted) return;

    const selector = this.getAttribute('observe-scroll-element');
    const scrollElement = selector ? document.querySelector<HTMLElement>(selector) : window;
    if (!scrollElement) {
      console.warn(`tj-scroll-restore: '${selector}' did not match a scroll element.`);
      return;
    }
    this.#handler = new ScrollHandler(scrollElement);
    this.#handler.restoreScrollPosition();
    this.#handler.connectEventListener();
    window.addEventListener('hashchange', this.#onHashChange);
    document.addEventListener('click', this.#onDocumentClick);
  }
}

if (customElements.get('tj-scroll-restore')) {
  console.error('tj-scroll-restore is already defined. Please check for duplicate imports.');
} else {
  customElements.define('tj-scroll-restore', ScrollRestoreElement);
}
