import { getBreakpointMinWidth, getCurrentBreakpoint } from '../lib/breakpoints.js';
import { Debouncer } from '../lib/Debouncer';
import { waitForDomContentLoaded } from '../lib/wait-for';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface BreakPointMixinInterface {
  currentBreakPoint: string | null;
}

export function BreakPointMixin<TBase extends Constructor<object>>(Base: TBase) {
  abstract class BreakPoint extends Base implements BreakPointMixinInterface {
    #debouncer = new Debouncer(200, 5000);
    public currentBreakPoint: string | null = null;

    #updateBreakPoint = async () => {
      await this.#debouncer.wait();
      await waitForDomContentLoaded();
      const self = this as unknown as HTMLElement;

      const width = window.innerWidth;

      const breaksAt = getComputedStyle(self).getPropertyValue('--breakpoint');
      if (!breaksAt || breaksAt === '') {
        return;
      }

      const breaksAtArray = breaksAt.split(',');
      const breaksAtMobile = breaksAtArray[0].trim();
      const breaksAtTablet = breaksAtArray[1]?.trim() ?? breaksAtMobile;
      const newBreakPoint = getCurrentBreakpoint(width);

      if (this.currentBreakPoint !== newBreakPoint) {
        if (getBreakpointMinWidth(breaksAtTablet) <= getBreakpointMinWidth(newBreakPoint)) {
          self.setAttribute('mode', 'desktop');
        } else if (getBreakpointMinWidth(breaksAtMobile) > getBreakpointMinWidth(newBreakPoint)) {
          self.setAttribute('mode', 'mobile');
        } else {
          self.setAttribute('mode', 'tablet');
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

  return BreakPoint as TBase & Constructor<BreakPointMixinInterface>;
}
