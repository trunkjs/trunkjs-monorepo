import { Debouncer, waitForDomContentLoaded } from '@trunkjs/browser-utils';
import { parseStyleAttribute } from './style-attribute-parser';

export function getCurrentBreakpoint(): string {
  const width = window.innerWidth;
  const breakpoints = {
    xxl: 1400,
    xl: 1200,
    lg: 992,
    md: 768,
    sm: 576,
    xs: 0,
  };

  for (const [key, value] of Object.entries(breakpoints)) {
    if (width >= value) {
      return key;
    }
  }
  return 'xs';
}

export class TjResponsive {
  private breakpoints: { [key: string]: number } = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  };

  private originalData = new WeakMap<HTMLElement, { classes: string; styles: string }>();

  constructor() {
    if (window.config && window.config?.breakpoints) {
      this.breakpoints = window.config.breakpoints;
    }
  }

  /**
   * Adjusts classes and inline styles of the target element and its children
   * based on the defined breakpoints.
   *
   * @param target HTMLElement to process
   */
  public adjust(target: HTMLElement | ShadowRoot | Document = document): void {
    const elements: HTMLElement[] = [];
    if (target instanceof HTMLElement) {
      elements.push(target);
    } else if (target instanceof ShadowRoot) {
      elements.push(
        ...(Array.from(target.querySelectorAll('*')).filter((el) =>
          this.needsResponsiveProcessing(el as HTMLElement),
        ) as HTMLElement[]),
      );
    } else if (target instanceof Document) {
      elements.push(
        ...(Array.from(target.querySelectorAll('*')).filter((el) =>
          this.needsResponsiveProcessing(el as HTMLElement),
        ) as HTMLElement[]),
      );
    } else {
      console.warn('TjResponsive: Target is not a valid HTMLElement, ShadowRoot, or Document.', target);
      throw new Error('TjResponsive: Target is not a valid HTMLElement, ShadowRoot, or Document.');
    }

    elements.forEach((element) => {
      if (!this.originalData.has(element)) {
        this.originalData.set(element, {
          classes: element.className,
          styles: element.getAttribute('style') || '',
        });
      }

      this.applyResponsiveClasses(element, window.innerWidth);
      this.applyResponsiveStyles(element, window.innerWidth);
    });
  }

  /**
   * Determines whether an element should be processed for responsive styles.
   */
  private needsResponsiveProcessing(element: HTMLElement): boolean {
    if (!(element instanceof HTMLElement)) {
      return false; // Reject svg and other non-HTMLElement types
    }
    if (element.hasAttribute('class')) {
      return true;
    }

    for (const attr of Array.from(element.attributes)) {
      if (/^[a-z]+-style$/.test(attr.name)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Parses and applies responsive CSS classes based on conditions.
   */
  private applyResponsiveClasses(element: HTMLElement, width: number): void {
    const classList = element.className.split(/\s+/);
    const newClasses = new Set<string>();
    const originalClasses = new Set(this.originalData.get(element)?.classes.split(/\s+/) || []);

    originalClasses.forEach((cls) => {
      const match = cls.match(/^(-?)([a-z]+)(?:-([a-z]+))?:(.+)$/);

      if (match) {
        const [, negative, bp1, bp2, className] = match;
        let minWidth = this.breakpoints[bp1];
        let maxWidth = bp2 ? this.breakpoints[bp2] : undefined;

        // Evaluate -xl:class for up to the breakpoint
        if (!bp2 && !maxWidth && negative === '-') {
          minWidth = 0;
          maxWidth = this.breakpoints[bp1];
        } else if (!bp2 && !maxWidth && negative !== '-') {
          minWidth = this.breakpoints[bp1];
          maxWidth = undefined;
        }

        const qualifies = this.shouldApplyClass(width, minWidth, maxWidth);

        if (qualifies) {
          newClasses.add(className);
        }
      } else {
        newClasses.add(cls);
      }
    });

    element.className = [...newClasses].filter((cls) => originalClasses.has(cls) || newClasses.has(cls)).join(' ');
  }

  /**
   * Parses and applies responsive inline styles based on conditions.
   */
  private applyResponsiveStyles(element: HTMLElement, width: number): void {
    Array.from(element.attributes).forEach((attr) => {
      const match = attr.name.match(/^([a-z]+)-style$/);
      if (match) {
        const bp = match[1];
        const minWidth = this.breakpoints[bp];

        element.setAttribute('style', this.originalData.get(element)?.styles || '');
        if (width >= minWidth) {
          for (const [prop, val, pri] of parseStyleAttribute(attr.value)) element.style.setProperty(prop, val, pri);
        }
      }
    });
  }

  /**
   * Determines whether a class should be applied based on breakpoints.
   */
  private shouldApplyClass(width: number, minWidth: number, maxWidth?: number): boolean {
    if (maxWidth !== undefined) {
      return width > minWidth && width <= maxWidth;
    }
    return width > minWidth;
  }

  /**
   * Observes changes in target element and its children, adjusting content dynamically.
   *
   * @param target HTMLElement to observe
   */
  async observe(target: HTMLElement | Document | ShadowRoot): Promise<void> {
    await waitForDomContentLoaded();
    console.log('TjResponsive: Observing changes in target element', target);
    const debouncer = new Debouncer(100, 500);
    let currentBreakpoint = getCurrentBreakpoint();
    window.addEventListener('resize', async () => {
      await debouncer.wait();
      if (currentBreakpoint === getCurrentBreakpoint()) {
        return;
      }
      console.log('Responsive: Resize event detected: ' + getCurrentBreakpoint());
      currentBreakpoint = getCurrentBreakpoint();
      this.adjust(target);
    });
    this.adjust(target);
  }
}

declare global {
  interface Window {
    config?: { breakpoints: { [key: string]: number } };
    TjResponsive?: TjResponsive;
  }
}
