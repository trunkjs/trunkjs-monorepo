import { describe, expect, it } from 'vitest';
import { ProlitElement, scopeDefine, isScope, isProlitScope, defineReactiveScope } from '@trunkjs/prolit';
import { ProlitDialogElement } from '@trunkjs/prolit/dialog';
import { createSimpleDialogRenderer } from '@trunkjs/prolit/dialog/simple';
import { createDialogRouteRenderer } from '@trunkjs/prolit/router';

describe('public package boundaries', () => {
  it('exposes components and adapters without registering unrelated custom elements', () => {
    expect(ProlitElement).toBeTypeOf('function');
    expect(ProlitDialogElement).toBeTypeOf('function');
    expect(createSimpleDialogRenderer).toBeTypeOf('function');
    expect(createDialogRouteRenderer).toBeTypeOf('function');
    for (const name of ['prolit-scope', 'tj-include', 'tj-animate-changes']) {
      expect(customElements.get(name)).toBeUndefined();
    }
    const scope = scopeDefine({ $tpl: '<p>{{ name }}</p>', name: 'Ada' });
    expect(isScope(scope)).toBe(true);
    expect(isProlitScope(scope)).toBe(true);
    expect(isProlitScope(defineReactiveScope({ name: 'Ada' }))).toBe(false);
  });

  it('registers only the HTML scope when explicitly imported', async () => {
    const { ProlitScopeElement } = await import('@trunkjs/prolit/html');
    expect(customElements.get('prolit-scope')).toBe(ProlitScopeElement);
    expect(customElements.get('tj-include')).toBeUndefined();
    expect(customElements.get('tj-animate-changes')).toBeUndefined();
  });
});
