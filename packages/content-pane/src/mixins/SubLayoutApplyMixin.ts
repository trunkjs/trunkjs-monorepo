import type { LitElement } from 'lit';
import { applyLayout } from '../lib/apply-layout';
import { resolveMultiQuerySelectAll } from '../lib/multiQuerySelectAll';
type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface SubLayoutApplyInterface {
  beforeLayoutCallback(element: HTMLElement, replacementElement: HTMLElement, children: HTMLElement[]): boolean;
  firstUpdated(changedProperties: Map<string, unknown>): void;
}

type SlotAssignment = {
  slotElement: HTMLSlotElement;
  slotName: string;
  elements: HTMLElement[];
};

function applySlotAssignment({ slotElement, slotName, elements }: SlotAssignment) {
  elements.forEach((matchedElement) => {
    slotElement
      .getAttributeNames()
      .filter((attrName) => attrName.startsWith('data-set-attribute-'))
      .forEach((attrName) => {
        const newName = attrName.replace(/^data-set-attribute-/, '');
        if (!matchedElement.hasAttribute(newName)) {
          const value = slotElement.getAttribute(attrName);
          if (value !== null) matchedElement.setAttribute(newName, value);
        }
      });

    if (slotName !== '') matchedElement.setAttribute('slot', slotName);
  });
}

export function SubLayoutApplyMixin<TBase extends Constructor<LitElement>>(
  Base: TBase,
): TBase & Constructor<SubLayoutApplyInterface> {
  abstract class SubLayoutApply extends Base {
    public beforeLayoutCallback(element: HTMLElement, replacementElement: HTMLElement, children: HTMLElement[]) {
      return false; // Skip apply layout to sub-elements by default
    }

    override firstUpdated(changedProperties: Map<string, unknown>) {
      super.firstUpdated?.(changedProperties);
      const queryElements = this.shadowRoot?.querySelectorAll('slot[data-query]') ?? [];
      const variableAssignments: SlotAssignment[] = [];

      for (const slotElement of Array.from(queryElements)) {
        if (!(slotElement instanceof HTMLSlotElement)) continue;

        const slotName = slotElement.getAttribute('name') ?? '';
        if (slotName !== '') {
          // Only apply the logic to empty named slots. The default slot is not empty before this logic runs.
          const assignedElements = slotElement.assignedElements({ flatten: true });
          if (assignedElements.length > 0) continue;
        }

        const query = slotElement.getAttribute('data-query');
        if (!query) continue;

        try {
          const result = resolveMultiQuerySelectAll(query, this);
          const assignment = { slotElement, slotName, elements: result.elements };

          if (result.source === 'variable') variableAssignments.push(assignment);
          else applySlotAssignment(assignment);
        } catch (error) {
          // @ts-expect-error Provided by the concrete base element.
          this.error(`"${error}" in slot`, slotElement);
          throw error;
        }
      }

      // Theme-controlled selectors intentionally override built-in selector assignments,
      // independent of the slots' order in the shadow DOM.
      variableAssignments.forEach(applySlotAssignment);

      applyLayout(Array.from(this.children), { recursive: true });
    }
  }

  return SubLayoutApply as TBase & Constructor<SubLayoutApplyInterface>;
}
