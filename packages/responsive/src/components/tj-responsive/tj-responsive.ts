import { Debouncer, EventBindingsMixin, getCurrentBreakpoint, Listen, LoggingMixin } from '@trunkjs/browser-utils';
import { ElementObserver } from '../../lib/ElementObserver';

export class TjResponsiveElement extends EventBindingsMixin(LoggingMixin(HTMLElement)) {
  static get observedAttributes() {
    // Optional attributes that might influence layout; trigger a re-adjust when changed.
    return ['width', 'height', 'orientation'];
  }

  private resizeDebouncer: Debouncer = new Debouncer(50, 1500);

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

  async connectedCallback() {
    // @ts-ignore - Call parent method if it exists, even if not defined in HTMLElement
    super.connectedCallback?.(); // <-- Important! Otherwise event handling wont work!

    this.#breakpoint = getCurrentBreakpoint();
    this.#elementObserver.breakpoint = this.#breakpoint;
    this.debug('Initializing ElementObserver for responsive adjustments.', this.#breakpoint);
    this.#elementObserver.startObserving(this);
    this.#elementObserver.queueAll();
  }

  disconnectedCallback() {
    // @ts-ignore - Call parent method if it exists, even if not defined in HTMLElement
    super.disconnectedCallback?.();

    this.debug('TjResponsiveElement disconnected from the DOM.');
    this.#elementObserver.stopObserving();
  }
}

// Safe define: do not throw if already registered in the page.
if (!customElements.get('tj-responsive')) {
  customElements.define('tj-responsive', TjResponsiveElement);
}
