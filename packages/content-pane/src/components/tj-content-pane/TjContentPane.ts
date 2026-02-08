import {
  Debouncer,
  EventBindingsMixin,
  Listen,
  LoggingMixin,
  session_storage,
  sleep,
  Stopwatch,
  waitForDomContentLoaded,
  waitForLoad,
} from '@trunkjs/browser-utils';
import { ReactiveElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { applyLayout } from '../../lib/apply-layout';
import { SectionTreeBuilder } from '../../lib/SectionTreeBuilder';

const tjSessionStage = session_storage('tj_sess_state', {
  lhref: '', // The last Page that was loaded
  scrollpos: 0,
  sessstart: Date.now(),
  pages: 0,
});

const scrollDebouncer = new Debouncer(100, 200);

@customElement('tj-content-pane')
export class ContentAreaElement2 extends EventBindingsMixin(LoggingMixin(ReactiveElement)) {
  static get is() {
    return 'tj-content-pane';
  }

  @property({ type: Boolean, reflect: true, attribute: 'skip-layout' })
  accessor skipLayout = false;

  override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  constructor() {
    super();
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }

  #afterScrolling = false;

  @Listen('scroll', { target: 'window', options: { passive: true } })
  private async onScroll() {
    if (!this.#afterScrolling) {
      return; // Wait
    }
    await scrollDebouncer.wait();
    const pos = Math.round(window.scrollY || window.pageYOffset);
    tjSessionStage.scrollpos = pos;
  }

  private async scrollToPosition() {
    await waitForLoad(); // Wait for media to be loaded
    const curUrl = window.location.href;
    let reload = true;
    if (tjSessionStage.lhref !== curUrl) {
      // New page loaded
      reload = false;
      tjSessionStage.lhref = curUrl;
      tjSessionStage.pages += 1;
      tjSessionStage.scrollpos = 0; // Reset scroll position for new page
    }

    if (reload) {
      const scrollToIndex = tjSessionStage.scrollpos;
      // On Reload
      for (let i = 0; i < 10; i++) {
        window.scrollTo({ top: scrollToIndex, behavior: 'auto' });
        // Check if the scroll position is beyound the current scroll height, if so wait and check again
        // add the screen height to the scroll position to check if the content is loaded enough to scroll to the desired position

        if (scrollToIndex <= document.documentElement.scrollHeight - window.innerHeight + 1) {
          break;
        }
        await sleep(i * 50); // Wait a bit longer on each iteration
      }
      this.#afterScrolling = true;
      return;
    }

    // Locate anchor position from URL
    let hashElement: HTMLElement | null = null;
    const hash = window.location.hash;
    if (hash) {
      hashElement = document.getElementById(hash.substring(1));
      if (hashElement) {
        hashElement.scrollIntoView({ behavior: 'smooth' });
        this.#afterScrolling = true;
        return;
      }
    }
  }

  public arrange() {
    const sw = new Stopwatch('SectionTreeBuilder');

    this.log('arrange() called');
    const sectionTreeBuilder = new SectionTreeBuilder(this as HTMLElement);
    // Start with the first 3 children - wait and then add the rest

    const children = Array.from(this.children);

    // Step 1: Build the section tree
    sectionTreeBuilder.arrange(children);

    // Step 2: Apply the layout
    if (this.skipLayout) {
      this.warn('Skipping layout as per skipLayout property.');
      return;
    }
    applyLayout(Array.from(this.children), { recursive: true });

    sw.lap('after arrange');
    this.scrollToPosition();
  }

  override async connectedCallback() {
    await waitForDomContentLoaded();

    super.connectedCallback();

    this.arrange();
  }
}
