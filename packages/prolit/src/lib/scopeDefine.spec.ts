import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
  ProLitTemplate,
  isProlitScope,
  prolit_html,
  scopeAction,
  scopeDefine,
  scopeResource,
  type ProlitScope,
  type ScopeResult,
} from '../../index';

describe('scopeDefine public contract', () => {
  it('brands scopes, not plain objects, and preserves user values', () => {
    const scope = scopeDefine({ name: 'Ada', $tpl: '<p>{{ name }}</p>' });
    expect(isProlitScope(scope)).toBe(true);
    expect(isProlitScope({ ...scope })).toBe(false);
    expect(isProlitScope({ $tpl: scope.$tpl })).toBe(false);
    expect(isProlitScope(null)).toBe(false);
    expect(scope.$tpl).toBeInstanceOf(ProLitTemplate);
    expect(scope.$tpl.scope).toBe(scope);
    expectTypeOf(scope.$raw.$tpl).toEqualTypeOf<ProLitTemplate | undefined>();
    expect(scope.$rawPure).toEqual({ name: 'Ada' });
    expect(scopeDefine(scope)).toBe(scope);
  });
  it('does not overwrite another scope when reusing a template', () => {
    const template = prolit_html`<p>{{ name }}</p>`;
    const a = scopeDefine({ name: 'Ada', $tpl: template });
    const b = scopeDefine({ name: 'Linus', $tpl: template });
    expect(a.$tpl.scope).toBe(a);
    expect(b.$tpl.scope).toBe(b);
    expect(a.$tpl).not.toBe(b.$tpl);
    expect(() => {
      a.$tpl = 3 as unknown as ProLitTemplate;
    }).toThrow('$tpl');
    expect(a.$tpl.scope).toBe(a);
  });
  it('keeps the legacy host update and explicit deep-mutation escape hatch', () => {
    const host = { requestUpdate: vi.fn() };
    const scope = scopeDefine({ name: 'Ada', items: [] as string[], $this: host as never });
    scope.name = 'Linus';
    scope.name = 'Linus';
    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    scope.items.push('one');
    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
    scope.$update();
    expect(host.requestUpdate).toHaveBeenCalledTimes(2);
  });
  it('preserves callback parameters, async results and rejects unknown keys at compile time', () => {
    const scope = scopeDefine({
      name: 'Ada',
      users: scopeResource({ load: async (_context, id: string) => [{ id }], errorMessage: 'Load failed' }),
      $fn: {
        select: (id: string) => id.length,
        save: scopeAction({ run: async (name: string) => ({ name }), errorMessage: 'Save failed' }),
      },
      $tpl: prolit_html`<p>{{ name }}</p>`,
    });
    expectTypeOf(scope).toMatchTypeOf<ProlitScope>();
    expectTypeOf(scope.$fn.select).parameters.toEqualTypeOf<[string]>();
    expectTypeOf(scope.users.reload).returns.toEqualTypeOf<Promise<ScopeResult<{ id: string }[]>>>();
    expectTypeOf(scope.$fn.save).returns.toEqualTypeOf<Promise<ScopeResult<{ name: string }>>>();
    // These checks are compiled by the package spec TypeScript target.
    const typeChecks = () => {
      // @ts-expect-error Unknown scope key must not inherit an any index signature.
      scope.missing;
      // @ts-expect-error Unknown callback.
      scope.$fn.missing();
      // @ts-expect-error Wrong resource argument.
      scope.users.reload(42);
      // @ts-expect-error Required action argument.
      scope.$fn.save();
      // @ts-expect-error Operation state is read-only.
      scope.users.pending = false;
    };
    expect(typeChecks).toBeTypeOf('function');
  });
  it('does not share resource or action state between scopes', () => {
    const users = scopeResource({ load: async () => [], errorMessage: 'Load failed' });
    scopeDefine({ users });
    expect(() => scopeDefine({ users })).toThrow('separate resource/action');
    const save = scopeAction({ run: async () => 1, errorMessage: 'Save failed' });
    scopeDefine({ $fn: { save } });
    expect(() => scopeDefine({ $fn: { save } })).toThrow('separate resource/action');
  });
});
