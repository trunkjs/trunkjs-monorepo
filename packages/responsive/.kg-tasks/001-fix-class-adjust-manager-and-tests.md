---
slugName: fix-class-adjust-manager-and-tests
includeFiles:
- ./src/lib/class-adjust-manager.ts
- ./src/lib/ElementObserver.ts
- ./vite.config.ts
- ./index.html
- ./README.md
editFiles:
- ./src/lib/class-adjust-manager.ts
- ./tests/class-adjust-manager.spec.ts
original_prompt: fix class-adjust-manager and create unittests for it
---
# Prepare Fix class-adjust-manager and create unit tests

Fix responsive class parsing/adjustment and add comprehensive unit tests for class-adjust-manager.

## Assumptions

- Breakpoint thresholds are obtained via getBreakpointMinWidth(bpName: string) and represent the minimum width (in px) where a breakpoint becomes active.
- Range semantics:
  - "-bp:class" is active for widths with minWidth(current) < minWidth(bp).
  - "bp:class" is active for widths with minWidth(current) >= minWidth(bp).
  - "bp1-bp2:class" is active for minWidth(current) >= minWidth(bp1) and < minWidth(bp2).
  - "bp-:class" is treated like "bp:class" (open-ended upper bound).
- Idempotency: After adjustment, only plain (non-responsive) class tokens remain in the class attribute. All responsive tokens (with ":") are removed. Plain class tokens that match any observed responsive class names are removed and re-added only if active for the current breakpoint.
- Unknown/invalid breakpoint names won’t be provided in inputs (tests will use bootstrap-like defaults).

## Tasks

- fix parsing and ranges in class-adjust-manager
- ensure idempotency: remove responsive tokens, re-apply only active classes
- support bp1-bp2, -bp, and bp- syntaxes
- rename getAdjustetClassString to getAdjustedClassString, keep alias
- add unit tests for parsing, ranges, idempotency, and DOM adjustment

## Overview: File changes

- ./src/lib/class-adjust-manager.ts Replace file; robust parsing, correct range logic, idempotent output, alias for old function name.
- ./tests/class-adjust-manager.spec.ts New file; unit tests for parsing, adjusted class string, and adjustElementClasses with mocked breakpoints.

## Detail changes

### ./src/lib/class-adjust-manager.ts

Referenced Tasks
- fix parsing and ranges in class-adjust-manager Implement full range support (-bp, bp, bp1-bp2, bp-)
- ensure idempotency: remove responsive tokens, re-apply only active classes Remove responsive tokens and duplicates; only active classes are present
- support bp1-bp2, -bp, and bp- syntaxes Parsing logic extended
- rename getAdjustetClassString to getAdjustedClassString, keep alias Provide new function name + backward-compatible alias

Replace entire file content with:

```ts
import { getBreakpointMinWidth } from '@trunkjs/browser-utils';

export interface ObservedClass {
  from: number;
  till: number;
  className: string;
  rawToken: string;
}

/**
 * Parse a breakpoint spec (left of :) into numeric range boundaries [from, till)
 * Semantics:
 * - "-bp"     => [0, min(bp))
 * - "bp"      => [min(bp), +inf)
 * - "bp-"     => [min(bp), +inf)
 * - "bp1-bp2" => [min(bp1), min(bp2))
 */
function parseBreakpointRange(spec: string): { from: number; till: number } {
  const s = spec.trim();
  if (!s) return { from: 0, till: Infinity };

  // "-bp"
  if (s.startsWith('-')) {
    const right = s.slice(1).trim();
    return { from: 0, till: getBreakpointMinWidth(right) };
  }

  // "bp-"
  if (s.endsWith('-')) {
    const left = s.slice(0, -1).trim();
    return { from: getBreakpointMinWidth(left), till: Infinity };
  }

  // "bp1-bp2"
  const dashIdx = s.indexOf('-');
  if (dashIdx >= 0) {
    const left = s.slice(0, dashIdx).trim();
    const right = s.slice(dashIdx + 1).trim();
    const from = getBreakpointMinWidth(left);
    const till = right ? getBreakpointMinWidth(right) : Infinity;
    return { from, till };
  }

  // "bp"
  return { from: getBreakpointMinWidth(s), till: Infinity };
}

/**
 * Extract observed (responsive) class tokens from input.
 * Returns ranges and the plain className (right of :) along with the raw token.
 */
export function getObservedClasses(input: string): ObservedClass[] {
  const parts = input.split(/\s+/).filter(Boolean);
  const retArr: ObservedClass[] = [];

  for (const token of parts) {
    const colon = token.indexOf(':');
    if (colon <= 0) continue;

    const spec = token.slice(0, colon);
    const className = token.slice(colon + 1).trim();
    if (!className) continue;

    const { from, till } = parseBreakpointRange(spec);
    retArr.push({ from, till, className, rawToken: token });
  }

  return retArr;
}

/**
 * Compute adjusted plain class list (idempotent):
 * - Remove all responsive tokens (with :)
 * - Remove any plain class that is managed by a responsive token (same className)
 * - Add back only those responsive class names whose range matches current breakpoint
 * Returns a space-separated class string containing only plain class names.
 */
export function getAdjustedClassString(input: string, breakpoint: string): string {
  if (!input || typeof input !== 'string') return '';

  const parts = input.split(/\s+/).filter(Boolean);
  const observed = getObservedClasses(input);
  if (observed.length === 0) {
    // No responsive tokens: return normalized spacing
    return parts.join(' ');
  }

  const minWidth = getBreakpointMinWidth(breakpoint);

  // Base tokens: keep only non-responsive tokens which are not managed by responsive ones
  const observedNames = new Set(observed.map(o => o.className));
  const basePlain = parts.filter(t => !t.includes(':') && !observedNames.has(t));

  // Active responsive class names
  const active: string[] = [];
  for (const o of observed) {
    if (minWidth >= o.from && minWidth < o.till) {
      active.push(o.className);
    }
  }

  // Merge and dedupe while preserving order
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...basePlain, ...active]) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }

  return out.join(' ');
}

/**
 * Backward compatible alias with original misspelled name.
 */
export const getAdjustetClassString = getAdjustedClassString;

/**
 * Adjust the element's class attribute based on current breakpoint.
 * Replaces class attribute content with only plain classes (idempotent).
 */
export function adjustElementClasses(element: HTMLElement, breakpoint: string) {
  const origClasses = element.getAttribute('class') || '';
  const newClasses = getAdjustedClassString(origClasses, breakpoint);
  if (newClasses !== origClasses) {
    element.setAttribute('class', newClasses);
  }
}
```

### ./tests/class-adjust-manager.spec.ts

Referenced Tasks
- add unit tests for parsing, ranges, idempotency, and DOM adjustment Tests cover -bp, bp, bp1-bp2, bp- syntaxes; ensure idempotency and DOM mutation

Create file with the following content:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock breakpoints
vi.mock('@trunkjs/browser-utils', () => {
  const map: Record<string, number> = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  };
  return {
    getBreakpointMinWidth: (bp: string) => {
      const v = map[bp];
      if (typeof v !== 'number') {
        throw new Error(`Unknown breakpoint: ${bp}`);
      }
      return v;
    },
  };
});

import {
  getObservedClasses,
  getAdjustedClassString,
  getAdjustetClassString,
  adjustElementClasses,
} from '../src/lib/class-adjust-manager';

describe('class-adjust-manager: getObservedClasses', () => {
  it('parses -bp tokens', () => {
    const input = '-xl:text-blue  xl:text-red';
    const obs = getObservedClasses(input);
    const minus = obs.find(o => o.rawToken.startsWith('-xl:'))!;
    const plus = obs.find(o => o.rawToken.startsWith('xl:'))!;
    expect(minus.className).toBe('text-blue');
    expect(minus.from).toBe(0);
    expect(minus.till).toBe(1200); // [0, 1200)
    expect(plus.className).toBe('text-red');
    expect(plus.from).toBe(1200);
    expect(plus.till).toBe(Infinity);
  });

  it('parses bp1-bp2 tokens', () => {
    const input = 'md-xl:text-green';
    const [o] = getObservedClasses(input);
    expect(o.className).toBe('text-green');
    expect(o.from).toBe(768);
    expect(o.till).toBe(1200);
  });

  it('parses trailing open range bp- (same as bp:)', () => {
    const input = 'xl-:d-none';
    const [o] = getObservedClasses(input);
    expect(o.className).toBe('d-none');
    expect(o.from).toBe(1200);
    expect(o.till).toBe(Infinity);
  });
});

describe('class-adjust-manager: getAdjustedClassString', () => {
  it('returns input unchanged when no responsive tokens exist (normalized spacing)', () => {
    expect(getAdjustedClassString('foo   bar', 'md')).toBe('foo bar');
  });

  it('activates -xl before xl, ranges are [from, till)', () => {
    const input = '-xl:text-blue xl:text-red';

    // md: 768 -> <1200 => text-blue
    expect(getAdjustedClassString(input, 'md')).toBe('text-blue');

    // xl: 1200 -> >=1200 => text-red
    expect(getAdjustedClassString(input, 'xl')).toBe('text-red');

    // xxl: 1400 => text-red as well
    expect(getAdjustedClassString(input, 'xxl')).toBe('text-red');
  });

  it('activates md-xl only between md and before xl', () => {
    const input = 'base md-xl:text-green other';

    expect(getAdjustedClassString(input, 'sm')).toBe('base other');           // below md
    expect(getAdjustedClassString(input, 'md')).toBe('base other text-green'); // >= md and < xl
    expect(getAdjustedClassString(input, 'lg')).toBe('base other text-green'); // >= md and < xl
    expect(getAdjustedClassString(input, 'xl')).toBe('base other');            // at xl it's not active
  });

  it('supports bp- as open-ended upper bound (same as bp:)', () => {
    const input = 'xl-:d-none -xl:d-block';
    expect(getAdjustedClassString(input, 'lg')).toBe('d-block');
    expect(getAdjustedClassString(input, 'xl')).toBe('d-none');
    expect(getAdjustedClassString(input, 'xxl')).toBe('d-none');
  });

  it('removes responsive tokens and plain duplicates for observed class names (idempotent)', () => {
    const input = 'btn -xl:btn xl:btn-lg  other';
    // At md (< xl): "btn" is observed; it should be re-added because "-xl" matches, and responsive tokens removed
    const once = getAdjustedClassString(input, 'md');
    expect(once).toBe('other btn');

    // Calling again should be a no-op (idempotent)
    const twice = getAdjustedClassString(once, 'md');
    expect(twice).toBe('other btn');
  });

  it('keeps ordering stable, avoids duplicates', () => {
    const input = 'a a -md:b md:c d md:c';
    const outSm = getAdjustedClassString(input, 'sm'); // < md -> active: -md:b
    expect(outSm).toBe('a d b');
    const outMd = getAdjustedClassString(input, 'md'); // >= md -> active: md:c
    expect(outMd).toBe('a d c');
  });

  it('exposes backward compatible alias getAdjustetClassString', () => {
    const input = '-xl:red xl:blue';
    expect(getAdjustetClassString(input, 'md')).toBe('red');
  });
});

describe('class-adjust-manager: adjustElementClasses', () => {
  let el: HTMLElement;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('mutates the class attribute to only plain active classes', () => {
    el.setAttribute('class', 'box -xl:text-blue xl:text-red other');
    adjustElementClasses(el, 'sm'); // < xl
    expect(el.getAttribute('class')).toBe('box other text-blue');

    adjustElementClasses(el, 'xl'); // >= xl
    expect(el.getAttribute('class')).toBe('box other text-red');
  });

  it('is a no-op if no changes are needed', () => {
    el.setAttribute('class', 'foo bar');
    const before = el.getAttribute('class')!;
    adjustElementClasses(el, 'md');
    expect(el.getAttribute('class')).toBe(before);
  });
});
```

## Example prompts to improve the original request

- “Fix class-adjust-manager to support -bp, bp, bp1-bp2, and bp- syntaxes with left-inclusive/right-exclusive ranges, and add unit tests verifying idempotency.”
- “Normalize and refactor class-adjust-manager so responsive tokens are removed from class attributes and only active classes remain; add comprehensive Vitest tests.”