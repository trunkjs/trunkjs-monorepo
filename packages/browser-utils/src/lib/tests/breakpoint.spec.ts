import { describe, expect, it } from 'vitest';
import { breakpoints, getBreakpointMinWidth, getCurrentBreakpoint } from '../breakpoints';

describe('breakpoints utils', () => {
  it('getBreakpointMinWidth returns correct values and throws for unknown', () => {
    expect(getBreakpointMinWidth('xs')).toBe(0);
    expect(getBreakpointMinWidth('xxl')).toBe(1400);
    expect(() => getBreakpointMinWidth('unknown')).toThrowError('Unknown breakpoint: unknown');
  });

  it('getCurrentBreakpoint handles boundaries, in-range values, negatives, max, and window.innerWidth', () => {
    // Exactly at each breakpoint's minWidth
    for (const bp of breakpoints) {
      expect(getCurrentBreakpoint(bp.minWidth)).toBe(bp.name);
    }

    // Just below each breakpoint (should map to the previous one)
    for (let i = 1; i < breakpoints.length; i++) {
      const below = breakpoints[i].minWidth - 1;
      expect(getCurrentBreakpoint(below)).toBe(breakpoints[i - 1].name);
    }

    // Negative width falls back to 'xs'
    expect(getCurrentBreakpoint(-1)).toBe('xs');

    // Well above the largest breakpoint maps to the last breakpoint
    const last = breakpoints[breakpoints.length - 1];
    expect(getCurrentBreakpoint(last.minWidth + 5000)).toBe(last.name);

    // When width is omitted, it uses window.innerWidth
    const originalWindow = (globalThis as any).window;
    try {
      (globalThis as any).window = { innerWidth: 1100 };
      // 1100 is >= 992 (lg) and < 1200 (xl)
      expect(getCurrentBreakpoint()).toBe('lg');
    } finally {
      if (originalWindow === undefined) {
        delete (globalThis as any).window;
      } else {
        (globalThis as any).window = originalWindow;
      }
    }
  });
});
