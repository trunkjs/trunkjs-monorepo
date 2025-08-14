import { describe, expect, it } from 'vitest';
import { prolit_html, ProLitTemplate } from '../src/lib/proLitTemplate';
import { scopeDefine } from '../src/lib/scopeDefine';

describe('scopeDefine + Template', () => {
  it('throws when accessing $tpl before it is set', () => {
    const scope = scopeDefine({} as any);
    expect(() => (scope as any).$tpl).toThrow(/Template is not defined/i);
  });

  it('sets template.scope when assigning $tpl with a Template instance', () => {
    const scope = scopeDefine({ name: 'Alice' } as any);
    const tpl = prolit_html`<div>{{name}}</div>`;
    expect(tpl).toBeInstanceOf(ProLitTemplate);

    (scope as any).$tpl = tpl;

    expect(tpl.scope).toBe(scope);
  });

  it('rejects non-Template assignment to $tpl', () => {
    const scope = scopeDefine({} as any);
    expect(() => {
      (scope as any).$tpl = {} as any;
    }).toThrow(/\$tpl must be an instance of Template/i);
  });

  it('Template.render throws without an attached scope', () => {
    const tpl = prolit_html`<div></div>`;
    expect(() => tpl.render()).toThrow(/Scope is not defined/i);
  });
});
