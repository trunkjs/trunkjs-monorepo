import { describe, expect, it, vi } from 'vitest';

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
    getBreakpointMinWidth: (bp: string) => map[bp] ?? 0,
  };
});

import { adjustElementClasses, getObservedClasses } from '../class-adjust-manager';

describe('class-adjust-manager', () => {
  describe('getObservedClasses', () => {
    it('parses breakpoint ranges and class names', () => {
      const input =
        '-xl:d-none xl:d-block md-xl:text-red plain :bad xl:  md- :also-bad   md-:ok  -md:foo  md-lg:bar  lg-:baz';
      const observed = getObservedClasses(input);
      // Only valid entries should be parsed
      // -xl:d-none  => [0, 1200)
      // xl:d-block  => [1200, +inf)
      // md-xl:text-red => [768, 1200)
      // md-:ok      => [768, +inf)
      // -md:foo     => [0, 768)
      // md-lg:bar   => [768, 992)
      // lg-:baz     => [992, +inf)
      expect(observed).toEqual([
        { from: 0, till: 1200, className: 'd-none' },
        { from: 1200, till: Infinity, className: 'd-block' },
        { from: 768, till: 1200, className: 'text-red' },
        { from: 768, till: Infinity, className: 'ok' },
        { from: 0, till: 768, className: 'foo' },
        { from: 768, till: 992, className: 'bar' },
        { from: 992, till: Infinity, className: 'baz' },
      ]);
    });
  });

  describe('adjustElementClasses', () => {
    it('updates element class attribute according to breakpoint', () => {
      const el = document.createElement('div');
      el.setAttribute('class', 'plain -md:foo md:bar');

      adjustElementClasses(el, 'sm');
      expect(el.getAttribute('class')).toBe('plain -md:foo md:bar foo');

      adjustElementClasses(el, 'md');
      expect(el.getAttribute('class')).toBe('plain -md:foo md:bar bar');
    });
  });
});
