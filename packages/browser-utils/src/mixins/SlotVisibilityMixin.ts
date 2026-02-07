import type { LitElement } from 'lit';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface SlotVisibilityInterface {
  firstUpdated(changedProperties: Map<string, unknown>): void;
}

export function SlotVisibilityMixin<TBase extends Constructor<object & LitElement>>(
  Base: TBase,
): TBase & Constructor<SlotVisibilityInterface> {
  abstract class SlotVisibility extends Base {
    override firstUpdated(changedProperties: Map<string, unknown>) {
      super.firstUpdated?.(changedProperties);
      this.#initializeSlots();
    }

    #initializeSlots() {
      const slots = this.shadowRoot?.querySelectorAll('slot');
      slots?.forEach((slot: HTMLSlotElement) => {
        slot.classList.add('slot-empty');
        slot.addEventListener('slotchange', (e) => this.#onSlotChange(e));
      });
    }

    #onSlotChange = (e: Event) => {
      const slot = e.target as HTMLSlotElement;
      const assigned = slot.assignedNodes({ flatten: true }).filter((n) => this.#isRenderableNode(n));

      const hasContent = assigned.length > 0;

      if (hasContent) {
        slot.classList.remove('slot-empty');
      }
    };

    #isRenderableNode(n: Node): boolean {
      if (n.nodeType === Node.TEXT_NODE) {
        return (n.textContent || '').trim().length > 0;
      }
      return n.nodeType === Node.ELEMENT_NODE;
    }
  }

  return SlotVisibility;
}
