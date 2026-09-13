import type { LitElement } from 'lit';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface SlotVisibilityInterface {
  firstUpdated(changedProperties: Map<string, unknown>): void;
}

export function SlotVisibilityMixin<TBase extends Constructor<object & LitElement>>(
  Base: TBase,
): TBase & Constructor<SlotVisibilityInterface> {
  abstract class SlotVisibility extends Base {
    // Slots können bei Lit-Updates neu entstehen; die WeakMap verhindert doppelte Listener auf bestehenden Slots.
    #slotHandlers = new WeakMap<HTMLSlotElement, EventListener>();

    override firstUpdated(changedProperties: Map<string, unknown>) {
      super.firstUpdated?.(changedProperties);
      this.#initializeSlots();
    }

    override updated(changedProperties: Map<string, unknown>) {
      super.updated?.(changedProperties);
      this.#initializeSlots();
    }

    #initializeSlots() {
      const slots = this.shadowRoot?.querySelectorAll('slot');
      slots?.forEach((slot: HTMLSlotElement) => {
        this.#updateSlotState(slot);

        if (!this.#slotHandlers.has(slot)) {
          const handler: EventListener = (event) => this.#onSlotChange(event);
          this.#slotHandlers.set(slot, handler);
          slot.addEventListener('slotchange', handler);
        }
      });
    }

    #updateSlotState(slot: HTMLSlotElement) {
      const hasAssignedContent = this.#hasRenderableNodes(slot.assignedNodes({ flatten: true }));
      const hasDefaultContent = this.#hasRenderableNodes(slot.childNodes);

      if (hasAssignedContent || hasDefaultContent) {
        slot.classList.remove('slot-empty');
      } else {
        slot.classList.add('slot-empty');
      }
    }

    #onSlotChange = (e: Event) => {
      this.#updateSlotState(e.target as HTMLSlotElement);
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
