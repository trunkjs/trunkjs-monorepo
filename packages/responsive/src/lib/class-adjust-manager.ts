import { getBreakpointMinWidth } from './breakpoints';

export function getObservedClasses(input: string): { from: number; till: number; className: string }[] {
  const parts = input.split(' ');

  const retArr = [];
  for (const part of parts) {
    if (!part.includes(':')) {
      continue;
    }
    // eslint-disable-next-line prefer-const
    let [bp, className] = part.split(':');
    let mode = 'from';
    const ret = { from: 0, till: Infinity, className };
    if (bp.startsWith('-')) {
      mode = 'till';
      bp = bp.slice(1);
      ret.till = getBreakpointMinWidth(bp);
    } else {
      ret.from = getBreakpointMinWidth(bp);
    }
    retArr.push(ret);
  }

  return retArr;
}

export function getAdjustetClassString(input: string, breakpoint: string) {
  if (!input.includes(':')) return input; // Speed up for simple cases

  const minWidth = getBreakpointMinWidth(breakpoint);

  let splitClasses = input.split(' ');

  const observedClasses = getObservedClasses(input);

  // Remove all class names that are observed
  for (const observed of observedClasses) {
    splitClasses = splitClasses.filter((c) => c !== observed.className);
  }

  // Then add back the classes that match the current breakpoint
  for (const observed of observedClasses) {
    if (minWidth >= observed.from && minWidth < observed.till) {
      splitClasses.push(observed.className);
    }
  }

  console.log(`Breakpoint: ${breakpoint} (${minWidth}px) => Classes: ${splitClasses.join(' ')}`);
  return splitClasses.join(' ');
}

export function adjustElementClasses(element: HTMLElement, breakpoint: string) {
  const origClasses = element.getAttribute('class') || '';

  const newClasses = getAdjustetClassString(origClasses, breakpoint);
  if (newClasses !== origClasses) {
    element.setAttribute('class', newClasses);
  }
}
