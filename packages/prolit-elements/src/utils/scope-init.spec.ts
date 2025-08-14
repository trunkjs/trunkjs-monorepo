import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateScopeInitExpression } from './scope-init';

describe('evaluateScopeInitExpression', () => {
  const hostDefault = {} as unknown as Element;

  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    const mockFetch = vi.fn(async (url: string) => {
      let data: unknown;
      switch (url) {
        case '/api/user':
          data = { name: 'Alice', repeatCount: 2 };
          break;
        case '/api':
          data = { foo: 'bar', n: 123 };
          break;
        default:
          data = { ok: true, url };
      }
      return {
        ok: true,
        status: 200,
        json: async () => data,
        text: async () => JSON.stringify(data),
      } as unknown as Response;
    });
    // @ts-expect-error assigning mock to global fetch in node env
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // restore original fetch
    // @ts-expect-error restore to possibly undefined
    globalThis.fetch = originalFetch;
  });

  it('evaluates a simple object expression', async () => {
    const res = await evaluateScopeInitExpression(hostDefault, "{ name: 'World', repeatCount: 3 }", {} as any);
    expect(res).toEqual({ name: 'World', repeatCount: 3 });
  });

  it('evaluates an expression using fetch and await', async () => {
    const res = await evaluateScopeInitExpression(hostDefault, "await (await fetch('/api/user')).json()", {} as any);
    expect(res).toEqual({ name: 'Alice', repeatCount: 2 });
  });

  it('evaluates a full async function body (statements + explicit return)', async () => {
    const res = await evaluateScopeInitExpression(
      hostDefault,
      "const data = await (await fetch('/api')).json(); return { ...data, extra: true }",
      {} as any,
    );
    expect(res).toEqual({ foo: 'bar', n: 123, extra: true });
  });

  it('supports javascript: prefix and access to host and scope', async () => {
    const host = { tagName: 'TJ-HTML-SCOPE' } as unknown as Element;
    const scope = { initial: 42 } as any;

    const res = await evaluateScopeInitExpression(
      host,
      "javascript: ({ hostTag: host.tagName, scoped: scope.initial, added: 'ok' })",
      scope,
    );
    expect(res).toEqual({ hostTag: 'TJ-HTML-SCOPE', scoped: 42, added: 'ok' });
  });

  it('throws a helpful error when the result is not an object', async () => {
    await expect(evaluateScopeInitExpression(hostDefault, '42', {} as any)).rejects.toThrow(
      /must evaluate to an object/,
    );
  });

  it('throws when body returns undefined (no return)', async () => {
    await expect(evaluateScopeInitExpression(hostDefault, 'const a = 1; // no return', {} as any)).rejects.toThrow(
      /must evaluate to an object/,
    );
  });
});
