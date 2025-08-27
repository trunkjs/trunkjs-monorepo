import { getBreakpointMinWidth } from '@trunkjs/browser-utils';

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

export function getObservedClasses(input: string): { from: number; till: number; className: string }[] {
  const parts = input.split(' ');

  const retArr = [];
  for (const part of parts) {
    if (!part.includes(':')) {
      continue;
    }
    // eslint-disable-next-line prefer-const
    let [bp, className] = part.split(':');
    if (!bp || !className) {
      continue;
    }
    const def = parseBreakpointRange(bp);
    const ret = { from: def.from, till: def.till, className };

    retArr.push(ret);
  }

  return retArr;
}

export function getAdjustetClassString(input: string, breakpoint: string, addedClasses: Set<string>) {
  if (!input.includes(':')) return input; // Speed up for simple cases

  const minWidth = getBreakpointMinWidth(breakpoint);

  let splitClasses = input.split(' ');

  const observedClasses = getObservedClasses(input);

  // Remove all previeously added classes
  for (const cls of addedClasses) {
    splitClasses = splitClasses.filter((c) => c !== cls);
  }
  for (const observed of observedClasses) {
    splitClasses = splitClasses.filter((c) => c !== observed.className);
  }

  // Then add back the classes that match the current breakpoint
  for (const observed of observedClasses) {
    if (minWidth >= observed.from && minWidth < observed.till) {
      splitClasses.push(observed.className);
      addedClasses.add(observed.className);
    }
  }

  console.log(`Breakpoint: ${breakpoint} (${minWidth}px) => Classes: ${splitClasses.join(' ')}`);
  return splitClasses.join(' ');
}

export function adjustElementClasses(element: HTMLElement, breakpoint: string) {
  const origClasses = element.getAttribute('class') || '';

  let addedClasses = autoAddedClassNamesMap.get(element);
  if (!addedClasses) {
    addedClasses = new Set<string>();
    autoAddedClassNamesMap.set(element, addedClasses);
  }

  const newClasses = getAdjustetClassString(origClasses, breakpoint, addedClasses);
  if (newClasses !== origClasses) {
    element.setAttribute('class', newClasses);
  }
}
