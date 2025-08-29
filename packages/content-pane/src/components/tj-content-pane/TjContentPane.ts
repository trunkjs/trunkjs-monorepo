import { LoggingMixin, Stopwatch, waitForDomContentLoaded } from '@trunkjs/browser-utils';
import { ReactiveElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { applyLayout } from '../../lib/apply-layout';
import { SectionTreeBuilder } from '../../lib/SectionTreeBuilder';

@customElement('tj-content-pane')
export class ContentAreaElement2 extends LoggingMixin(ReactiveElement) {
  static get is() {
    return 'tj-content-pane';
  }

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

    sectionTreeBuilder.arrange(children);

    applyLayout(Array.from(this.children), { recursive: true });

    sw.lap('after arrange');
  }

  override async connectedCallback() {
    await waitForDomContentLoaded();

    super.connectedCallback();

    this.arrange();
  }
}
