import { applyLayout } from '../lib/apply-layout';
import { multiQuerySelectAll } from '../lib/multiQuerySelectAll';
import type { LitElement } from 'lit';
type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface SubLayoutApplyInterface {
  beforeLayoutCallback(element: HTMLElement, replacementElement: HTMLElement, children: HTMLElement[]): boolean;
  firstUpdated(changedProperties: Map<string, unknown>): void;
}

export function SubLayoutApplyMixin<TBase extends Constructor<LitElement>>(
  Base: TBase,
): TBase & Constructor<SubLayoutApplyInterface> {
  abstract class SubLayoutApply extends Base {
    public beforeLayoutCallback(element: HTMLElement, replacementElement: HTMLElement, children: HTMLElement[]) {
      return false; // Skip spply layout to sub-elements by default
    }

    override firstUpdated(changedProperties: Map<string, unknown>) {
      super.firstUpdated?.(changedProperties);
      const queryElements = this.shadowRoot?.querySelectorAll('slot[data-query]') ?? [];
      for (const slotElement of Array.from(queryElements)) {
        const query = slotElement.getAttribute('data-query');
        if (!query) continue;

        let queriedElements = [] as HTMLElement[];
        try {
          queriedElements = multiQuerySelectAll(query, this);
        } catch (error) {
          // @ts-expect-error
          this.error(`"${error}" in slot`, slotElement);
          throw error;
        }

        queriedElements.forEach((matchedElement) => {
          // Select all attributes starting with data-set-attribute-
          slotElement
            .getAttributeNames()
            .filter((attrName) => attrName.startsWith('data-set-attribute-'))
            .forEach((attrName) => {
              const newName = attrName.replace(/^data-set-attribute-/, '');
              if (!matchedElement.hasAttribute(newName)) {
                const value = slotElement.getAttribute(attrName);
                if (value !== null) {
                  matchedElement.setAttribute(newName, value);
                }
              }
            });

          if (!matchedElement.hasAttribute('slot')) {
            const slotName = slotElement.getAttribute('name');
            if (slotName) matchedElement.setAttribute('slot', slotName);
          }
        });
      }

      applyLayout(Array.from(this.children), { recursive: true });
    }
  }

  return SubLayoutApply;
}
