import { describe, expect, it } from 'vitest';
import { ReflectionGenerator } from '../reflection-generator/reflection-generator';

describe('ReflectionGenerator – typeRefIds', () => {
  it('adds typeRefIds for referenced local types (including unions and generics)', () => {
    const gen = new ReflectionGenerator({ useSysHost: false });
    const defs = gen.addSourceFileFromText(
      '/virtual/type-refs.ts',
      `
        export interface User {
          id: string;
        }

        export type Box<T> = { value: T };

        export type Wrapped = Box<User | null>;

        export type Api = {
          user: User;
          wrapped: Wrapped;
        };
      `.trim(),
    );

    const byKindName = (kind: string, name: string) => defs.find((d) => d.kind === kind && d.name === name);

    const user = byKindName('interface', 'User');
    const box = byKindName('typeAlias', 'Box');
    const wrapped = byKindName('typeAlias', 'Wrapped');
    const api = byKindName('typeAlias', 'Api');

    expect(user?.id).toBeTruthy();
    expect(box?.id).toBeTruthy();
    expect(wrapped?.id).toBeTruthy();
    expect(api?.id).toBeTruthy();

    // Wrapped = Box<User | null>
    expect(wrapped?.typeRefIds).toContain(box!.id);
    expect(wrapped?.typeRefIds).toContain(user!.id);

    const apiUser = api?.members?.find((m) => m.name === 'user');
    expect(apiUser?.typeRefIds).toEqual(expect.arrayContaining([user!.id]));

    const apiWrapped = api?.members?.find((m) => m.name === 'wrapped');
    expect(apiWrapped?.typeRefIds).toEqual(expect.arrayContaining([wrapped!.id]));
  });

  it('resolves type alias references through aliases', () => {
    const gen = new ReflectionGenerator({ useSysHost: false });
    const defs = gen.addSourceFileFromText(
      '/virtual/type-refs-alias.ts',
      `
        export type A = { a: string };
        export type B = A;

        export type Api = {
          b: B;
        };
      `.trim(),
    );

    const a = defs.find((d) => d.kind === 'typeAlias' && d.name === 'A');
    const b = defs.find((d) => d.kind === 'typeAlias' && d.name === 'B');
    const api = defs.find((d) => d.kind === 'typeAlias' && d.name === 'Api');

    expect(a?.id).toBeTruthy();
    expect(b?.id).toBeTruthy();

    // B = A -> we reference A (aliased)
    expect(b?.typeRefIds).toContain(a!.id);

    // Api.b: B -> with aliasing semantic we still resolve to A
    const apiB = api?.members?.find((m) => m.name === 'b');
    expect(apiB?.typeRefIds).toContain(a!.id);
  });
});
