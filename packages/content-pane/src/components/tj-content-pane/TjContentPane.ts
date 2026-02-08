import {
  Debouncer,
  EventBindingsMixin,
  Listen,
  LoggingMixin,
  session_storage,
  Stopwatch,
  waitForDomContentLoaded,
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

const scrollDebouncer = new Debouncer(50, 100);

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
  }

  @Listen('scroll', { target: 'window', options: { passive: true } })
  private async onScroll() {
    await scrollDebouncer.wait();
    tjSessionStage.scrollpos = window.scrollY || window.pageYOffset;
  }

  private scrollToPosition() {
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
      // On Reload
      console.log('Reload detected, restoring scroll position to', tjSessionStage.scrollpos);
      window.scrollTo(0, tjSessionStage.scrollpos);
      return;
    }

    // Locate anchor position from URL
    let hashElement: HTMLElement | null = null;
    const hash = window.location.hash;
    if (hash) {
      hashElement = document.getElementById(hash.substring(1));
      if (hashElement) {
        hashElement.scrollIntoView({ behavior: 'smooth' });
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
