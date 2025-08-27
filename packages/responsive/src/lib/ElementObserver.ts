import { Debouncer, Logger } from '@trunkjs/browser-utils';
import { getCurrentBreakpoint } from '../../../browser-utils/src/lib/breakpoints';
import { adjustElementClasses } from './class-adjust-manager';

export class ElementObserver {
  protected observer: MutationObserver | null = null;

  protected changedElements = new Set<HTMLElement>();

  protected debouncer: Debouncer = new Debouncer(10, 100);

  public breakpoint: string = getCurrentBreakpoint();

  constructor(public logger: Logger) {}

  public async processChanges() {
    for (const el of this.changedElements) {
      this.logger.log('Processing element', el);
      adjustElementClasses(el, this.breakpoint);

      this.changedElements.delete(el); // Delete only after processing to avoid re-adding during processing
    }
  }

  private async spoolElement(element: HTMLElement) {
    if (this.changedElements.has(element)) {
      return;
    }
    this.changedElements.add(element);

    // Wait and run rest only once
    await this.debouncer.wait();
    this.processChanges();
  }

  public onChange(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        if (!(mutation.target instanceof HTMLElement)) {
          continue;
        }
        this.spoolElement(mutation.target);
      } else if (mutation.type === 'attributes') {
        if (!(mutation.target instanceof HTMLElement)) {
          continue;
        }
        if (!(mutation.attributeName === 'class' || mutation.attributeName?.startsWith('style'))) {
          continue;
        }
        this.spoolElement(mutation.target);
      }
    }
  }

  /**
   * Queue all all elements (or those under root) that have class or style-* attributes
   *
   * @param root
   */
  public queueAll(root: HTMLElement | null = null) {
    if (root === null) {
      root = document.body;
    }
    // Query all Elements witth class  attributes
    root.querySelectorAll('[class]').forEach((e) => this.spoolElement(e as HTMLElement));

    // Query all Elements with style-* attributes
    Array.from(root.getElementsByTagName('*'))
      .filter((el) => [...el.getAttributeNames()].some((a) => a.startsWith('style-')))
      .forEach((e) => this.spoolElement(e as HTMLElement));
  }

  public startObserving(target: HTMLElement) {
    this.observer = new MutationObserver(this.onChange.bind(this));
    this.observer.observe(target, { attributes: true, childList: true, subtree: true });
  }

  public stopObserving() {
    this.observer?.disconnect();
  }
}
