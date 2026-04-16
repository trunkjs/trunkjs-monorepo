import { describe, expect, it, vi } from 'vitest';

vi.mock('@trunkjs/browser-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@trunkjs/browser-utils')>();

  const map: Record<string, number> = {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  };

  return {
    ...actual,
    getBreakpointMinWidth: (bp: string) => map[bp] ?? 0,
  };
});

import { Logger } from '@trunkjs/browser-utils';
import { adjustElementClasses, getObservedClasses } from '../class-adjust-manager';

const testLogger = new Logger(true, 'test', 'test');

describe('class-adjust-manager', () => {
  describe('getObservedClasses', () => {
    it('parses breakpoint ranges and class names', () => {
      const input =
        '-xl:d-none xl:d-block md-xl:text-red plain :bad xl:  md- :also-bad   md-:ok  -md:foo  md-lg:bar  lg-:baz';
      const observed = getObservedClasses(new Set(input.split(' ')));
      // Only valid entries should be parsed
      // -xl:d-none  => [0, 1200)
      // xl:d-block  => [1200, +inf)
      // md-xl:text-red => [768, 1200)
      // md-:ok      => [768, +inf)
      // -md:foo     => [0, 768)
      // md-lg:bar   => [768, 992)
      // lg-:baz     => [992, +inf)
      expect(observed).toEqual({
        data: [
          { from: 0, till: 1200, className: 'd-none' },
          { from: 1200, till: Infinity, className: 'd-block' },
          { from: 768, till: 1200, className: 'text-red' },
          { from: 768, till: Infinity, className: 'ok' },
          { from: 0, till: 768, className: 'foo' },
          { from: 768, till: 992, className: 'bar' },
          { from: 992, till: Infinity, className: 'baz' },
        ],
        observedClassNames: new Set(['d-none', 'd-block', 'text-red', 'ok', 'foo', 'bar', 'baz']),
      });
    });

    it('parses chained syntax with multiple breakpoints and leading colon', () => {
      const input = 'class1:xl:class2:xxl:class4 :xl:classOnlyFromXl';
      const observed = getObservedClasses(new Set(input.split(' ')));

      expect(observed).toEqual({
        data: [
          { from: 0, till: 1200, className: 'class1' },
          { from: 1200, till: 1400, className: 'class2' },
          { from: 1400, till: Infinity, className: 'class4' },
          { from: 1200, till: Infinity, className: 'classOnlyFromXl' },
        ],
        observedClassNames: new Set(['class1', 'class2', 'class4', 'classOnlyFromXl']),
      });
    });
  });

  describe('adjustElementClasses', () => {
    it('updates element class attribute according to breakpoint', () => {
      const el = document.createElement('div');
      // In JSDOM ist `isConnected` read-only (Getter). Für "connected" also real ins DOM hängen.
      document.body.appendChild(el);
      try {
        el.setAttribute('class', 'plain -md:foo md:bar');

        adjustElementClasses(el, 'sm', testLogger);
        expect(el.getAttribute('class')).toBe('plain -md:foo md:bar foo');

        adjustElementClasses(el, 'md', testLogger);
        expect(el.getAttribute('class')).toBe('plain -md:foo md:bar bar');
      } finally {
        el.remove();
      }
    });

    it('applies chained responsive classes across breakpoints', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      try {
        el.setAttribute('class', 'class1:xl:class2:xxl:class4 :xl:classOnlyFromXl class1');

        adjustElementClasses(el, 'lg', testLogger);
        expect(el.getAttribute('class')).toBe('class1:xl:class2:xxl:class4 :xl:classOnlyFromXl class1');

        adjustElementClasses(el, 'xl', testLogger);
        expect(el.getAttribute('class')).toBe('class1:xl:class2:xxl:class4 :xl:classOnlyFromXl class2 classOnlyFromXl');

        adjustElementClasses(el, 'xxl', testLogger);
        expect(el.getAttribute('class')).toBe('class1:xl:class2:xxl:class4 :xl:classOnlyFromXl class4 classOnlyFromXl');
      } finally {
        el.remove();
      }
    });

    it('allows multiple classes in chained', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      try {
        el.setAttribute('class', 'class1.class2:xl:class3');

        adjustElementClasses(el, 'lg', testLogger);
        expect(el.getAttribute('class')).toBe('class1.class2:xl:class3 class1 class2');

        adjustElementClasses(el, 'xl', testLogger);
        expect(el.getAttribute('class')).toBe('class1.class2:xl:class3 class3');
      } finally {
        el.remove();
      }
    });
  });
});
