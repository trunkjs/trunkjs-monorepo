import { ScrollHandler } from '../../lib/scroll-handler';
import { loaderRunLevels } from '../../lib/loader-controller';
import { tj_loader_state_internal } from '../../lib/tj-loader-state';

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const startTime = Date.now();

export class LoaderElement extends HTMLElement {
  #startTime = startTime;
  #scrollHandler: ScrollHandler | null = null;
  #runPromise: Promise<void> | null = null;

  connectedCallback() {
    tj_loader_state_internal.state = 'loading';
    this.#runPromise ??= this.#run();
  }

  async #run() {
    try {
      await loaderRunLevels.run(this, { startWhen: this.#waitForDomContentLoaded() });
    } catch (error) {
      console.error('Loader run-level pipeline failed:', error);
    }
    await this.#reveal();
  }

  #waitForDomContentLoaded(): Promise<void> {
    if (document.readyState !== 'loading') return Promise.resolve();
    return new Promise((resolve) => window.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
  }

  #registerScrollHandler() {
    const selector = this.getAttribute('observe-scroll-element');

    let scrollElement: Window | HTMLElement | null = window;
    if (selector) {
      scrollElement = document.querySelector(selector) as HTMLElement | null;
      if (!scrollElement) {
        console.warn(
          `Scroll handler observe-scroll-element: '${selector}' did not match any element. Scroll restoration will be disabled.`,
        );
        return;
      }
    }
    this.#scrollHandler = new ScrollHandler(scrollElement);
    this.#scrollHandler?.connectEventListener();
    this.#scrollHandler?.restoreScrollPosition();
  }

  async #reveal() {
    this.classList.add('ready');
    await sleep(1);
    tj_loader_state_internal.state = 'ready';
    this.dispatchEvent(new CustomEvent('loader:ready', { bubbles: true, composed: true }));
    console.debug(`Loader ready after ${Date.now() - this.#startTime}ms`);

    await sleep(10);
    tj_loader_state_internal.state = 'pre-visual';
    this.setAttribute('data-loader-visual-stage', 'visible');
    this.classList.add('pre-visual');
    this.dispatchEvent(new CustomEvent('loader:pre-visual', { bubbles: true, composed: true }));
    console.debug(`Loader pre-visual after ${Date.now() - this.#startTime}ms`);

    await sleep(150);
    tj_loader_state_internal.state = 'visual';
    this.classList.add('visual');
    await sleep(1);
    this.dispatchEvent(new CustomEvent('loader:visual', { bubbles: true, composed: true }));

    this.#registerScrollHandler();
    console.debug(`Loader visual after ${Date.now() - this.#startTime}ms`);

    await sleep(500);
    this.classList.add('after-visual');
  }
}

// check if the element is already defined - if so trigger error
if (customElements.get('tj-loader')) {
  console.error('tj-loader is already defined. Please check for duplicate imports or custom element definitions.');
} else {
  customElements.define('tj-loader', LoaderElement);
}
