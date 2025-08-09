import { describe, expect, it } from 'vitest';
import { getArgNames } from './get-arg-names';

describe('getArgNames', () => {
  it('parses classic function with defaults, destructuring, nested arrows and strings', () => {
    // function with mixture of parameter kinds
    // - required: a, f
    // - with defaults: b, c, d, e
    // - destructured (should be ignored): { x, y } = { ... }
    // - strings with commas inside
    function foo(
      a: any,
      b = 42,
      { x, y } = { x: 1, y: 2 },
      c = { k: 'v,with,commas' },
      d = [1, 2, 3],
      e = b,
      f: any /* comment */,
    ) {
      return;
    }

    const res = getArgNames(foo);
    expect(res).toEqual({
      a: { isOptional: false, hasDefault: false },
      b: { isOptional: true, hasDefault: true },
      c: { isOptional: true, hasDefault: true },
      d: { isOptional: true, hasDefault: true },
      e: { isOptional: true, hasDefault: true },
      f: { isOptional: false, hasDefault: false },
    });
  });

  it('parses arrow functions (paren and single param) and rest params', () => {
    // @ts-expect-error // Arrow functions are not typed in this test
    const fn1 = (a, b = 'x, y', ...rest) => {
      return null;
    };
    const fn2 = (q: any) => q;

    const res1 = getArgNames(fn1);
    const res2 = getArgNames(fn2);

    expect(res1).toEqual({
      a: { isOptional: false, hasDefault: false },
      b: { isOptional: true, hasDefault: true },
      rest: { isOptional: false, hasDefault: false },
    });

    expect(res2).toEqual({
      q: { isOptional: false, hasDefault: false },
    });
  });

  it('parses class constructor and ignores destructured params; handles class without constructor', () => {
    class A {
      // @ts-expect-error // Class constructor
      constructor(a, b = 1, { z } = {}) {
        return null;
      }
    }
    class B {}

    const resA = getArgNames(A);
    const resB = getArgNames(B);

    expect(resA).toEqual({
      a: { isOptional: false, hasDefault: false },
      b: { isOptional: true, hasDefault: true },
    });
    expect(resB).toEqual({});
  });

  it('handles complex defaults with strings, templates and nested objects/arrays', () => {
    const fn = (
      a = `x,${1 + 2},y`,
      /* inline */ b /* two */ = 'a,b', // trailing about c
      c = { t: `a,b`, arr: [1, 2, 3] }, // End
    ) => {
      return null;
    };

    const res = getArgNames(fn);
    expect(res).toEqual({
      a: { isOptional: true, hasDefault: true },
      b: { isOptional: true, hasDefault: true },
      c: { isOptional: true, hasDefault: true },
    });
  });

  it('returns empty object for functions with no params', () => {
    function empty() {
      return null;
    }
    const res = getArgNames(empty);
    expect(res).toEqual({});
  });
});
