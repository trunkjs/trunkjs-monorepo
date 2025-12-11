import { Debouncer } from '@kasimirjs/core';
import { getBreakpointMinWidth, getCurrentBreakpoint } from '../lib/breakpoints.js';
import { waitForDomContentLoaded } from '../lib/wait-for';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export function BreakPointMixin<TBase extends Constructor<HTMLElement>>(Base: TBase) {
  const debouncer = new Debouncer(200, 5000);
  abstract class BreakPoint extends Base {
    public currentBreakPoint: string | null = null;

    #updateBreakPoint = async () => {
      await debouncer.debounce();
      await waitForDomContentLoaded();

      const width = window.innerWidth;

      let breaksAt = getComputedStyle(this).getPropertyValue('--breakpoint');
      if (!breaksAt) {
        this.style.setProperty('--breakpoint', 'md');
        breaksAt = getComputedStyle(this).getPropertyValue('--breakpoint');
      }

      const newBreakPoint = getCurrentBreakpoint(width);

      if (this.currentBreakPoint !== newBreakPoint) {
        if (getBreakpointMinWidth(breaksAt) < getBreakpointMinWidth(newBreakPoint)) {
          this.setAttribute('desktop', 'true');
        } else {
          this.removeAttribute('desktop');
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
