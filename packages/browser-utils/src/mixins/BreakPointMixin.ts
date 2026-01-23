import { getBreakpointMinWidth, getCurrentBreakpoint } from '../lib/breakpoints.js';
import { Debouncer } from '../lib/Debouncer';
import { waitForDomContentLoaded } from '../lib/wait-for';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export function BreakPointMixin<TBase extends Constructor<HTMLElement>>(Base: TBase) {
  abstract class BreakPoint extends Base {
    #debouncer = new Debouncer(200, 5000);
    public currentBreakPoint: string | null = null;

    #updateBreakPoint = async () => {
      await this.#debouncer.wait();
      await waitForDomContentLoaded();

      const width = window.innerWidth;

      const breaksAt = getComputedStyle(this).getPropertyValue('--breakpoint');
      if (!breaksAt || breaksAt === '') {
        return;
      }

      const breaksAtArray = breaksAt.split(",");
      const breaksAtMobile = breaksAtArray[0].trim();
      const breaksAtTablet = breaksAtArray[1]?.trim() ?? breaksAtMobile;
      const newBreakPoint = getCurrentBreakpoint(width);

      if (this.currentBreakPoint !== newBreakPoint) {
        if (getBreakpointMinWidth(breaksAtTablet) <= getBreakpointMinWidth(newBreakPoint)) {
          this.setAttribute('mode', 'desktop');
        } else if (getBreakpointMinWidth(breaksAtMobile) > getBreakpointMinWidth(newBreakPoint)) {
          this.setAttribute('mode', 'mobile');
        } else {
          this.setAttribute('mode', 'tablet');
        }
      }
    };

    connectedCallback() {
      // @ts-ignore
      super.connectedCallback();
      this.#updateBreakPoint();
      window.addEventListener('resize', this.#updateBreakPoint);
      this.#updateBreakPoint();
    }

    disconnectedCallback() {
      // @ts-ignore
      super.disconnectedCallback();
      window.removeEventListener('resize', this.#updateBreakPoint);
    }
  }

  return BreakPoint;
}
