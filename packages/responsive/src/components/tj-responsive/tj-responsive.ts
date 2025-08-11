import { Debouncer, LoggingMixin } from '@trunkjs/browser-utils';
import { getCurrentBreakpoint, TjResponsive } from '../../lib/responsive';

export class TjResponsiveElement extends LoggingMixin(HTMLElement) {
  static get observedAttributes() {
    // Optional attributes that might influence layout; trigger a re-adjust when changed.
    return ['width', 'height', 'orientation'];
  }

  private _observer?: MutationObserver;
  private _isAdjusting = false;
  private _debounce = new Debouncer(50, 200);
  private _responsive = new TjResponsive();
  private _resizeHandler?: () => void;
  private _currentBreakpoint?: string;

  constructor() {
    super();
    // Ensure contents render as if this element isn't present in layout.
    this.style.display = 'contents';
  }

  connectedCallback() {
    this.log('connectedCallback: Initializing responsive adjustments');

    // Ensure this element is not nested within another <tj-responsive> element.
    if (this.closest('tj-responsive') && this !== this.closest('tj-responsive')) {
      this.error('Nested <tj-responsive> elements are not allowed. Please remove the outer one.');
      throw new Error('Nested <tj-responsive> elements are not allowed.');
    }

    // Initial pass handles the case where this element is instantiated with content already present.
    this._adjustSubtree();

    // Start observing subtree for changes to trigger targeted adjustments.
    this._setupObserver();

    // Debounced resize handling that only adjusts when breakpoint changes.
    this._setupResize();
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    this._observer = undefined;
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = undefined;
    }
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;
    this._scheduleAdjust();
  }

  private _setupObserver() {
    if (this._observer) return;

    this._observer = new MutationObserver((records) => {
      // Prevent feedback loops: ignore mutations caused by our own adjustments.
      if (this._isAdjusting) return;

      const targets = new Set<HTMLElement>();
      let needsFullAdjust = false;

      for (const rec of records) {
        if (rec.type === 'childList') {
          // Added nodes: adjust them and their descendants.
          rec.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              targets.add(node as HTMLElement);
            }
          });
          // Removed nodes can affect siblings/parents; coalesce into a full subtree adjust.
          if (rec.removedNodes.length > 0) {
            needsFullAdjust = true;
          }
        } else if (rec.type === 'attributes') {
          // Only adjust for classes/styles or *-style changes.
          const attr = rec.attributeName || '';
          if (attr === 'class' || attr === 'style' || /[a-z]+-style$/.test(attr)) {
            targets.add(rec.target as HTMLElement);
          }
        }
      }

      // Coalesce many small changes into one full subtree adjust.
      if (needsFullAdjust || targets.size > 8) {
        this._scheduleAdjust();
      } else if (targets.size > 0) {
        this._scheduleAdjust(targets);
      }
    });

    this._observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: false,
      // attributeFilter cannot express wildcard for "*-style", so we filter in callback.
    });
  }

  private _setupResize() {
    if (this._resizeHandler) return;

    this._currentBreakpoint = getCurrentBreakpoint ? getCurrentBreakpoint() : undefined;
    const debouncer = new Debouncer(100, 500);

    this._resizeHandler = async () => {
      await debouncer.wait();
      if (getCurrentBreakpoint) {
        const bp = getCurrentBreakpoint();
        if (bp === this._currentBreakpoint) return;
        this._currentBreakpoint = bp;
      }
      this.log(`Resize event detected: ${this._currentBreakpoint}`);
      this._adjustSubtree();
    };

    window.addEventListener('resize', this._resizeHandler);
  }

  private _scheduleAdjust(targets?: Set<HTMLElement>) {
    // Debounce to coalesce rapid changes.
    this._debounce.wait().then(() => {
      if (!this.isConnected) return;
      if (targets && targets.size) {
        this._adjustTargets(targets);
      } else {
        this._adjustSubtree();
      }
    });
  }

  private _adjustTargets(targets: Set<HTMLElement>) {
    this._isAdjusting = true;
    try {
      for (const el of targets) {
        // Ensure element is still within this component's subtree.
        if (!this.contains(el)) continue;

        // Adjust the element itself.
        this._responsive.adjust(el);

        // Adjust its descendants (TjResponsive.adjust(HTMLElement) is shallow).
        const descendants = el.querySelectorAll('*');
        descendants.forEach((d) => this._responsive.adjust(d as HTMLElement));
      }
    } finally {
      this._isAdjusting = false;
    }
  }

  private _adjustSubtree() {
    this._isAdjusting = true;
    try {
      // Adjust the host element (in case it has responsive classes/attributes).
      this._responsive.adjust(this);

      // Adjust all descendants individually.
      const all = this.querySelectorAll('*');
      all.forEach((el) => this._responsive.adjust(el as HTMLElement));
    } finally {
      this._isAdjusting = false;
    }
  }
}

// Safe define: do not throw if already registered in the page.
if (!customElements.get('tj-responsive')) {
  customElements.define('tj-responsive', TjResponsiveElement);
}
