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
        if (!this.#hasRenderableNodes(slot.childNodes)) {
          slot.classList.add('slot-empty');
        }
        slot.addEventListener('slotchange', (e) => this.#onSlotChange(e));
      });
    }

    #onSlotChange = (e: Event) => {
      const slot = e.target as HTMLSlotElement;
      const hasAssignedContent = this.#hasRenderableNodes(slot.assignedNodes({ flatten: true }));
      const hasDefaultContent = this.#hasRenderableNodes(slot.childNodes);

      // Kein Content und keine Default Children
      if (hasAssignedContent || hasDefaultContent) {
        slot.classList.remove('slot-empty');
      } else {
        slot.classList.add('slot-empty');
      }
    };

    #hasRenderableNodes(nodes: ArrayLike<Node>): boolean {
      return Array.from(nodes).some((n) => this.#isRenderableNode(n));
    }

    #isRenderableNode(n: Node): boolean {
      if (n.nodeType === Node.TEXT_NODE) {
        return (n.textContent || '').trim().length > 0;
      }
      return n.nodeType === Node.ELEMENT_NODE;
    }
  }

  return SlotVisibility as TBase & Constructor<SlotVisibilityInterface>;
}
