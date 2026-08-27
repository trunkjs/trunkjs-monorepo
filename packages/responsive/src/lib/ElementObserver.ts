import { breakpointMap, Debouncer, getCurrentBreakpoint, Logger } from '@trunkjs/browser-utils';
import { registerElementArbitraryUtilities } from './arbitrary-utility-manager';
import { adjustElementClasses } from './class-adjust-manager';
import { adjustElementStyle } from './style-adjust-manager';

export class ElementObserver {
  protected observer: MutationObserver | null = null;

  protected changedElements = new Set<HTMLElement>();

  protected debouncer: Debouncer = new Debouncer(10, 100);

  public breakpoint: string = getCurrentBreakpoint();

  public utilityLayer: string | null = null;

  constructor(public logger: Logger) {}

  public async processChanges() {
    for (const el of this.changedElements) {
      registerElementArbitraryUtilities(el, this.utilityLayer, this.logger);
      adjustElementClasses(el, this.breakpoint, this.logger);
      adjustElementStyle(el, breakpointMap[this.breakpoint] || 0);

      this.changedElements.delete(el);
    }
  }

  private async spoolElement(element: HTMLElement) {
    if (this.changedElements.has(element)) {
      return;
    }
    this.changedElements.add(element);

    await this.debouncer.wait();
    this.processChanges();
  }

  public onChange(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        for (const addedNode of Array.from(mutation.addedNodes || [])) {
          if (addedNode instanceof HTMLElement) {
            this.queueAll(addedNode);
          }
        }
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

  /** Queue the root and its descendants that use class or style-* attributes. */
  public queueAll(root: HTMLElement | null = null) {
    if (root === null) {
      root = document.body;
    }

    if (root.hasAttribute('class') || root.getAttributeNames().some((a) => a.startsWith('style-'))) {
      this.spoolElement(root);
    }

    root.querySelectorAll('[class]').forEach((e) => this.spoolElement(e as HTMLElement));

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
