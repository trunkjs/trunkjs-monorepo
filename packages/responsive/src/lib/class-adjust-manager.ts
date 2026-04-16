import { getBreakpointMinWidth, Logger } from '@trunkjs/browser-utils';

const autoAddedClassNamesMap = new WeakMap<HTMLElement, Set<string>>();

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

export function getObservedClasses(input: Set<string>): {
  data: { from: number; till: number; className: string }[];
  observedClassNames: Set<string>;
} {
  const parts = input;

  let observedClassNames = new Set<string>();
  const retArr: { from: number; till: number; className: string }[] = [];
  for (const part of parts) {
    if (!part.includes(':')) {
      continue;
    }

    const segments = part.split(':');

    // Legacy/short syntax: "bp:class" (incl. "-bp:class")
    if (segments.length === 2) {
      const [bp, className] = segments;
      if (!bp || !className) {
        continue;
      }
      const def = parseBreakpointRange(bp);

      observedClassNames.add(className);
      retArr.push({ from: def.from, till: def.till, className });
      continue;
    }

    // Chain syntax: [baseClass]:bp1:class2:bp2:class3 ...
    // Also supports leading ":bp:class" (empty base class).
    const partWitLeadingBp = part.startsWith(':') ? part : '::' + part; // Add dummy leading class to simplify parsing (ensures even number of segments)

    let segmentsWithLeadingBp = partWitLeadingBp.split(':');

    let lastBp = segmentsWithLeadingBp[1]?.trim();
    let lastClass = segmentsWithLeadingBp[2]?.trim();
    for (let i = 3; i + 1 < segmentsWithLeadingBp.length; i += 2) {
      const bp = segmentsWithLeadingBp[i]?.trim();
      const className = segmentsWithLeadingBp[i + 1]?.trim();
      if (!bp || !className) {
        throw new Error(`Invalid breakpoint-class pair in part "${part}": "${bp}:${className}"`);
      }

      try {
        const def = parseBreakpointRange(`${lastBp}-${bp}`);
        retArr.push({ from: def.from, till: def.till, className: lastClass });
        observedClassNames.add(lastClass);
      } catch (e) {
        throw new Error(
          `Error parsing breakpoint range "${bp}" in part "${part}": ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      lastBp = bp;
      lastClass = className;
    }
    try {
      const def = parseBreakpointRange(`${lastBp}`);
      retArr.push({ from: def.from, till: def.till, className: lastClass });
      observedClassNames.add(lastClass);
    } catch (e) {
      throw new Error(
        `Error parsing breakpoint range "${lastBp}" in part "${part}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { data: retArr, observedClassNames };
}

export function getAdjustetClassString(input: string, breakpoint: string) {
  if (!input.includes(':')) return input; // Speed up for simple cases

  const minWidth = getBreakpointMinWidth(breakpoint);

  let splitClasses = new Set(input.split(' '));

  const observedClasses = getObservedClasses(splitClasses);

  for (const cls of observedClasses.observedClassNames) {
    splitClasses.delete(cls);
  }

  // Then add back the classes that match the current breakpoint
  for (const observed of observedClasses.data) {
    if (minWidth >= observed.from && minWidth < observed.till) {
      splitClasses.add(observed.className);
    }
  }

  return Array.from(splitClasses).join(' ');
}

export function adjustElementClasses(element: HTMLElement, breakpoint: string, logger: Logger) {
  const origClasses = element.getAttribute('class') || '';
  if (origClasses.indexOf(':') === -1) {
    return; // No observed classes, skip
  }

  // check if element is still in the DOM, otherwise skip (can happen when processing is delayed by debouncer)
  if (!element.isConnected) {
    logger.warn('Element is no longer connected to the DOM, skipping class adjustment:', element);
    return;
  }

  logger.debug('Adujsted class for element:', element);

  const newClasses = getAdjustetClassString(origClasses, breakpoint);
  if (newClasses !== origClasses) {
    element.setAttribute('class', newClasses);
  }
}
