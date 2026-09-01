export type TjElementRelocatorPlacement = 'inside' | 'before' | 'after';

const RELOCATE_CLASS = 'relocate';
const WARNING_MESSAGE = '<tj-element-relocator> warning';

export class TjElementRelocatorElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['class', 'source', 'placement'];
  }

  private sourceElement: Element | null = null;
  private sourceAnchor: Comment | null = null;

  connectedCallback(): void {
    this.sync();
  }

  disconnectedCallback(): void {
    this.restore();
  }

  attributeChangedCallback(): void {
    if (!this.isConnected) return;
    this.sync();
  }

  private sync(): void {
    this.warnAboutUnsupportedClasses();

    if (this.classList.contains(RELOCATE_CLASS)) {
      this.relocate();
    } else {
      this.restore();
    }
  }

  private relocate(): void {
    const sourceSelector = this.getAttribute('source')?.trim();
    if (!sourceSelector) {
      this.warn('Missing "source" selector.');
      return;
    }

    if (this.sourceElement && !this.matchesCurrentSource(sourceSelector)) {
      this.restore();
    }

    if (!this.sourceElement) {
      let source: Element | null;
      try {
        source = this.ownerDocument.querySelector(sourceSelector);
      } catch {
        this.warn(`Invalid "source" selector: "${sourceSelector}".`);
        return;
      }

      if (!source) {
        this.warn(`Source not found: "${sourceSelector}".`);
        return;
      }

      if (source === this || source.contains(this)) {
        this.warn('Source is the relocator or one of its ancestors.');
        return;
      }

      const parent = source.parentNode;
      if (!parent) {
        this.warn(`Source is detached: "${sourceSelector}".`);
        return;
      }

      this.sourceAnchor = this.ownerDocument.createComment('tj-element-relocator:source');
      parent.insertBefore(this.sourceAnchor, source);
      this.sourceElement = source;
    }

    this.placeSource();
  }

  private matchesCurrentSource(selector: string): boolean {
    try {
      return this.sourceElement?.matches(selector) ?? false;
    } catch {
      return false;
    }
  }

  private placeSource(): void {
    if (!this.sourceElement) return;

    switch (this.placement) {
      case 'before':
        this.before(this.sourceElement);
        break;
      case 'after':
        this.after(this.sourceElement);
        break;
      case 'inside':
        this.append(this.sourceElement);
        break;
    }
  }

  private restore(): void {
    if (this.sourceElement && this.sourceAnchor?.parentNode) {
      this.sourceAnchor.parentNode.insertBefore(this.sourceElement, this.sourceAnchor.nextSibling);
    }

    this.sourceAnchor?.remove();
    this.sourceAnchor = null;
    this.sourceElement = null;
  }

  private get placement(): TjElementRelocatorPlacement {
    const value = this.getAttribute('placement');
    if (value === 'before' || value === 'after' || value === 'inside') return value;

    if (value) {
      this.warn(`Unsupported placement: "${value}".`);
    }
    return 'inside';
  }

  private warn(reason: string): void {
    console.warn(WARNING_MESSAGE, { reason, element: this });
  }

  private warnAboutUnsupportedClasses(): void {
    const unsupported = [...this.classList].filter(
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
