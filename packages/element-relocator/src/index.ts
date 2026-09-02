const RELOCATE_CLASS = 'relocate';
const WARNING_MESSAGE = '<tj-element-relocator> warning';

export class TjElementRelocatorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['class', 'source', 'target'];
  }

  private sourceElement: Element | null = null;
  private targetElement: Element | null = null;
  private sourceObserver: MutationObserver | null = null;

  connectedCallback(): void {
    this.sync();
  }

  disconnectedCallback(): void {
    this.restore();
    this.sourceElement = null;
    this.targetElement = null;
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.sync();
  }

  private sync(): void {
    this.warnAboutUnsupportedClasses();

    const sourceSelector = this.getAttribute('source')?.trim();
    const targetSelector = this.getAttribute('target')?.trim();

    if (!sourceSelector || !targetSelector) {
      this.warn(`Missing ${!sourceSelector ? '"source"' : '"target"'} selector.`);
      return;
    }

    const source = this.querySelectorInDocument(sourceSelector, 'source');
    const target = this.querySelectorInDocument(targetSelector, 'target');
    if (!source || !target) return;

    if (source === target || source.contains(target) || target.contains(source)) {
      this.warn('Source and target must be different elements and must not contain each other.');
      return;
    }

    if (source !== this.sourceElement || target !== this.targetElement) {
      this.restore();
      this.sourceElement = source;
      this.targetElement = target;
    }

    if (this.classList.contains(RELOCATE_CLASS)) {
      this.observeSource();
      this.moveSourceItems();
    } else {
      this.restore();
    }
  }

  private querySelectorInDocument(selector: string, name: 'source' | 'target'): Element | null {
    try {
      const element = this.ownerDocument.querySelector(selector);
      if (!element) this.warn(`${name} not found: "${selector}".`);
      return element;
    } catch {
      this.warn(`Invalid "${name}" selector: "${selector}".`);
      return null;
    }
  }

  private observeSource(): void {
    if (this.sourceObserver || !this.sourceElement) return;

    this.sourceObserver = new MutationObserver(() => this.moveSourceItems());
    this.sourceObserver.observe(this.sourceElement, { childList: true });
  }

  private moveSourceItems(): void {
    if (!this.sourceElement || !this.targetElement || !this.classList.contains(RELOCATE_CLASS)) return;

    while (this.sourceElement.firstElementChild) {
      this.targetElement.append(this.sourceElement.firstElementChild);
    }
  }

  private restore(): void {
    this.disconnectSourceObserver();

    if (!this.sourceElement || !this.targetElement) return;

    while (this.targetElement.firstElementChild) {
      this.sourceElement.append(this.targetElement.firstElementChild);
    }
  }

  private disconnectSourceObserver(): void {
    this.sourceObserver?.disconnect();
    this.sourceObserver = null;
  }

  private warn(reason: string): void {
    console.warn(WARNING_MESSAGE, { reason, element: this });
  }

  private warnAboutUnsupportedClasses(): void {
    const unsupported = Array.from(this.classList).filter(
      (className) => className !== RELOCATE_CLASS && !className.includes(':'),
    );

    if (unsupported.length) {
      this.warn(`Unsupported classes: ${unsupported.join(', ')}.`);
    }
  }
}

if (!customElements.get('tj-element-relocator')) {
  customElements.define('tj-element-relocator', TjElementRelocatorElement);
}

declare global {
  interface HTMLElementTagNameMap {
    'tj-element-relocator': TjElementRelocatorElement;
  }
}
