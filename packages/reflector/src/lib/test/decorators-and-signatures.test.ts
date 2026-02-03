import { describe, expect, it } from 'vitest';
import { ReflectionGenerator } from '../reflection-generator/reflection-generator';

function byName<T extends { name: string }>(items: T[] | undefined, name: string): T | undefined {
  return items?.find((x) => x.name === name);
}

describe('ReflectionGenerator – decorators, params/return, accessors', () => {
  it('extracts decorators on class/method/property/function and method signature details', () => {
    const gen = new ReflectionGenerator({ useSysHost: false });
    const defs = gen.addSourceFileFromText(
      '/virtual/decorators.ts',
      `
        function dec(): any { return () => {}; }
        function dec2(arg: string): any { return () => {}; }

        @dec()
        export class C {
          @dec2('p')
          prop!: string;

          private _x = 1;

          get x(): number { return this._x; }
          set x(v: number) { this._x = v; }

          @dec()
          m(a: string, b?: number, ...rest: boolean[]): Promise<void> { return Promise.resolve(); }
        }

        @dec2('fn')
        export function fn(x: number): string { return String(x); }
      `.trim(),
    );

    const c = defs.find((d) => d.kind === 'class' && d.name === 'C');
    expect(c?.decorators?.[0]?.name).toBe('dec');

    const prop = byName(c?.members, 'prop');
    expect(prop?.decorators?.[0]?.name).toBe('dec2');
    expect(prop?.decorators?.[0]?.arguments?.[0]).toBe("'p'");

    const x = byName(c?.members, 'x');
    expect(x?.kind).toBe('property');
    expect(x?.hasGetter).toBe(true);
    expect(x?.hasSetter).toBe(true);
    expect(x?.typeText).toContain('number');

    const m = byName(c?.members, 'm');
    expect(m?.decorators?.[0]?.name).toBe('dec');
    expect(m?.params?.map((p) => p.name)).toEqual(['a', 'b', 'rest']);
    expect(m?.params?.[0]?.typeText).toContain('string');
    expect(m?.params?.[0]?.typeRefIds).toBeUndefined();
    expect(m?.params?.[1]?.isOptional).toBe(true);
    expect(m?.params?.[2]?.isRest).toBe(true);
    expect(m?.returnTypeText).toContain('Promise');

    const fn = defs.find((d) => d.kind === 'function' && d.name === 'fn');
    expect(fn?.decorators?.[0]?.name).toBe('dec2');
    expect(fn?.members?.[0]?.params?.[0]?.name).toBe('x');
    expect(fn?.members?.[0]?.params?.[0]?.typeRefIds).toBeUndefined();
    expect(fn?.members?.[0]?.returnTypeText).toContain('string');
  });
});
