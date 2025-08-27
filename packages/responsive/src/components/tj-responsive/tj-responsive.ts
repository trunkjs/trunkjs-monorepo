import { Debouncer, EventBindingsMixin, getCurrentBreakpoint, Listen, LoggingMixin } from '@trunkjs/browser-utils';
import { ElementObserver } from '../../lib/ElementObserver';

export class TjResponsiveElement extends EventBindingsMixin(LoggingMixin(HTMLElement)) {
  static get observedAttributes() {
    // Optional attributes that might influence layout; trigger a re-adjust when changed.
    return ['width', 'height', 'orientation'];
  }

  private resizeDebouncer: Debouncer = new Debouncer(50, 500);

  #breakpoint: string = getCurrentBreakpoint();

  #elementObserver = new ElementObserver(this.getLogger('observer'));

  constructor() {
    super();
  }

  @Listen('resize', { target: 'window' })
  private async onResize(ev: DocumentEventMap['resize']) {
    await this.resizeDebouncer.wait();

    const newBreakpoint = getCurrentBreakpoint();
    if (newBreakpoint !== this.#breakpoint) {
      this.#breakpoint = newBreakpoint;
      this.log(`Breakpoint changed to ${this.#breakpoint}, adjusting layout.`);
      this.#elementObserver.breakpoint = this.#breakpoint;
      this.#elementObserver.queueAll();
    }
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {}

  override connectedCallback() {
    super.connectedCallback();
    this.log('TjResponsiveElement connected to the DOM.');

    this.#breakpoint = getCurrentBreakpoint();
    this.#elementObserver.breakpoint = this.#breakpoint;
    this.#elementObserver.queueAll();
    this.#elementObserver.startObserving(this);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.log('TjResponsiveElement disconnected from the DOM.');
    this.#elementObserver.stopObserving();
  }
}

// Safe define: do not throw if already registered in the page.
if (!customElements.get('tj-responsive')) {
  customElements.define('tj-responsive', TjResponsiveElement);
}
