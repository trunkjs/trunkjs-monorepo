import { describe, expect, it } from 'vitest';
import { ReflectionGenerator } from '../reflection-generator/reflection-generator';

function byName<T extends { name: string }>(items: T[] | undefined, name: string): T | undefined {
  return items?.find((x) => x.name === name);
}

describe('ReflectionGenerator – typeAlias members', () => {
  it('extracts object-literal members including types and doc comments', () => {
    const gen = new ReflectionGenerator({ useSysHost: false });
    const defs = gen.addSourceFileFromText(
      '/virtual/type-alias.ts',
      `
        /** Type doc */
        export type T = {
          /** a doc */
          a: string;
          /** b doc */
          b?: number;
        };
      `.trim(),
    );

    const t = defs.find((d) => d.kind === 'typeAlias' && d.name === 'T');
    expect(t).toBeTruthy();

    expect(t?.members?.map((m) => m.name)).toContain('a');
    expect(t?.members?.map((m) => m.name)).toContain('b');

    const a = byName(t?.members, 'a');
    expect(a?.kind).toBe('property');
    expect(a?.typeText).toContain('string');
    expect(a?.doc?.comment).toContain('a doc');

    const b = byName(t?.members, 'b');
    expect(b?.isOptional).toBe(true);
    expect(b?.typeText).toContain('number');
    expect(b?.doc?.comment).toContain('b doc');
  });

  it('extracts members from intersections', () => {
    const gen = new ReflectionGenerator({ useSysHost: false });
    const defs = gen.addSourceFileFromText(
      '/virtual/type-alias-intersection.ts',
      `
        export interface A {
          /** a doc */
          a: string;
        }

        export type T = A & {
          /** c doc */
          c: boolean;
        };
      `.trim(),
    );

    const t = defs.find((d) => d.kind === 'typeAlias' && d.name === 'T');
    expect(t?.members?.map((m) => m.name).sort()).toEqual(['a', 'c']);

    expect(byName(t?.members, 'a')?.doc?.comment).toContain('a doc');
    expect(byName(t?.members, 'c')?.doc?.comment).toContain('c doc');
  });

  it('does not invent members for non-object aliases', () => {
    const gen = new ReflectionGenerator({ useSysHost: false });
    const defs = gen.addSourceFileFromText('/virtual/type-alias-primitive.ts', `export type T = string;`.trim());

    const t = defs.find((d) => d.kind === 'typeAlias' && d.name === 'T');
    expect(t?.members).toBeUndefined();
  });
});
