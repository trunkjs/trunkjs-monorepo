import {ReactiveElement} from "lit";
import {customElement} from "lit/decorators.js";
import {SectionTreeBuilder} from '../../lib/SectionTreeBuilder';
import { Stopwatch, waitForDomContentLoaded } from '@trunkjs/browser-utils';
import {LoggingMixin} from "@trunkjs/browser-utils";
import {applyLayout} from "../../lib/apply-layout";


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

  override async connectedCallback() {
    const sw = new Stopwatch("SectionTreeBuilder");

    await waitForDomContentLoaded();

    super.connectedCallback();


    const sectionTreeBuilder = new SectionTreeBuilder(this as HTMLElement);
    // Start with the first 3 children - wait and then add the rest

    const children = Array.from(this.children);

    sectionTreeBuilder.arrange(children);

    applyLayout(Array.from(this.children), {recursive: true});

    sw.lap("after arrange");
  }
}
