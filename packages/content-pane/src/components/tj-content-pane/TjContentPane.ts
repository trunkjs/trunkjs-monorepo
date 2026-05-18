import {
  Debouncer,
  EventBindingsMixin,
  LoaderMixin,
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

const scrollDebouncer = new Debouncer(100, 200);

export interface AfterArrangeEventDetail {
  target: HTMLElement;
}

@customElement('tj-content-pane')
export class ContentAreaElement2 extends EventBindingsMixin(LoggingMixin(LoaderMixin(ReactiveElement))) {
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

  public arrange() {
    const sw = new Stopwatch('SectionTreeBuilder');

    this.log('arrange() called');
    const sectionTreeBuilder = new SectionTreeBuilder(this as HTMLElement);
    // Start with the first 3 children - wait and then add the rest

    const children = Array.from(this.children);

    // Step 1: Build the section tree
    sectionTreeBuilder.arrange(children);

    this.debug('Firing afterArrange event');
    this.dispatchEvent(
      new CustomEvent<AfterArrangeEventDetail>('afterArrange', { detail: { target: this }, bubbles: true }),
    );

    // Step 2: Apply the layout
    if (this.skipLayout) {
      this.warn('Skipping layout as per skipLayout property.');
      return;
    }
    applyLayout(Array.from(this.children), { recursive: true });

    sw.lap('after arrange');
  }

  override async connectedCallback() {
    await waitForDomContentLoaded();

    super.connectedCallback();

    this.arrange();
  }
}
