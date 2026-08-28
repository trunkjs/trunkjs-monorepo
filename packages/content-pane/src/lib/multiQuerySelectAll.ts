export type MultiQueryMatchSource = 'selector' | 'variable';

export interface MultiQuerySelectAllResult {
  elements: HTMLElement[];
  source: MultiQueryMatchSource | null;
}

type QueryAlternative =
  | { type: 'selector'; selector: string }
  | { type: 'variable'; name: string; expression: string };

const variableExpression = /^@var\(\s*(--[a-zA-Z0-9_-]+)\s*\)$/;

function parseAlternatives(query: string): QueryAlternative[] {
  return query.split('|').map((part, index) => {
    const alternative = part.trim();
    if (!alternative) {
      throw new Error(`Empty selector alternative at position ${index + 1} in data-query "${query}".`);
    }

    if (!alternative.startsWith('@var')) {
      return { type: 'selector', selector: alternative };
    }

    const match = alternative.match(variableExpression);
    if (!match) {
      throw new Error(
        `Invalid CSS variable selector "${alternative}" in data-query "${query}". Expected @var(--custom-property).`,
      );
    }

    return { type: 'variable', name: match[1], expression: alternative };
  });
}

function selectAll(selector: string, element: HTMLElement, context: string): HTMLElement[] {
  try {
    return Array.from(element.querySelectorAll(selector)) as HTMLElement[];
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid CSS selector "${selector}" ${context}: ${reason}`);
  }
}

export function resolveMultiQuerySelectAll(query: string, element: HTMLElement): MultiQuerySelectAllResult {
  const alternatives = parseAlternatives(query);
  let computedStyle: CSSStyleDeclaration | undefined;

  for (const alternative of alternatives) {
    if (alternative.type === 'selector') {
      const elements = selectAll(alternative.selector, element, `in data-query "${query}"`);
      if (elements.length > 0) return { elements, source: 'selector' };
      continue;
    }

    computedStyle ??= getComputedStyle(element);
    const selector = computedStyle.getPropertyValue(alternative.name).trim();
    if (!selector) continue;

    const elements = selectAll(selector, element, `resolved from ${alternative.expression}`);
    if (elements.length > 0) return { elements, source: 'variable' };
  }

  return { elements: [], source: null };
}

export function multiQuerySelectAll(query: string, element: HTMLElement): HTMLElement[] {
  return resolveMultiQuerySelectAll(query, element).elements;
}
