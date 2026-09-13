import { prolit, prolit_html, scopeDefine, type ProlitScope } from '@trunkjs/prolit';
import { html, LitElement } from 'lit';
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { withProlitLightDom } from '../../index';

class Base extends LitElement {
  static override properties = { title: { type: String } };
  constructor(public readonly initialTitle = '') {
    super();
  }
  connects = 0;
  disconnects = 0;
  label(value: string) {
    return value;
  }
  override connectedCallback() {
    super.connectedCallback();
    this.connects++;
  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    this.disconnects++;
  }
}
class Workspace extends withProlitLightDom(Base) {
  readonly shadowScope = scopeDefine({ title: 'Frame', $tpl: prolit_html`<h1>{{ title }}</h1><slot></slot>` });
  protected override render() {
    return html`${prolit(this.shadowScope)}`;
  }
}
customElements.define('prolit-test-workspace', Workspace);
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('withProlitLightDom', () => {
  it('keeps independent scopes and preserves external children and the original host API', async () => {
    const host = new Workspace();
    const external = document.createElement('aside');
    external.textContent = 'external';
    host.append(external);
    const scope = scopeDefine({ name: 'Ada', $tpl: prolit_html`<p>{{ name }}</p>` });
    host.lightScope = scope;
    document.body.append(host);
    await host.updateComplete;
    expectTypeOf(host.label).parameters.toEqualTypeOf<[string]>();
    expectTypeOf<ConstructorParameters<typeof Workspace>>().toEqualTypeOf<[initialTitle?: string]>();
    expectTypeOf<Workspace['lightScope']>().toEqualTypeOf<ProlitScope | undefined>();
    expect(host.label('kept')).toBe('kept');
    expect(Workspace.elementProperties.has('title')).toBe(true);
    expect(host.shadowRoot!.querySelector('h1')!.textContent).toBe('Frame');
    expect(host.querySelector('[data-prolit-light] p')!.textContent).toBe('Ada');
    expect(host.contains(external)).toBe(true);
    scope.name = 'Linus';
    host.shadowScope.title = 'Other frame';
    await tick();
    expect(host.querySelector('p')!.textContent).toBe('Linus');
    expect(host.shadowRoot!.querySelector('h1')!.textContent).toBe('Other frame');
    expect(host.querySelectorAll('[data-prolit-light]')).toHaveLength(1);
  });
  it('connects/cleans up exactly once and handles reactive replacement or removal', async () => {
    const cleanup = vi.fn();
    const connect = vi.fn(() => cleanup);
    const scope = scopeDefine({ $hooks: { $connect: connect }, $tpl: prolit_html`<p>Ada</p>` });
    const host = new Workspace();
    host.lightScope = scope;
    document.body.append(host);
    await host.updateComplete;
    expect(connect).toHaveBeenCalledTimes(1);
    host.requestUpdate();
    await host.updateComplete;
    expect(connect).toHaveBeenCalledTimes(1);
    host.remove();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(host.disconnects).toBe(1);
    document.body.append(host);
    await host.updateComplete;
    expect(connect).toHaveBeenCalledTimes(2);
    expect(host.connects).toBe(2);
    host.lightScope = scopeDefine({ $tpl: prolit_html`<p>Linus</p>` });
    await host.updateComplete;
    expect(cleanup).toHaveBeenCalledTimes(2);
    expect(host.querySelector('p')!.textContent).toBe('Linus');
    host.lightScope = undefined;
    await host.updateComplete;
    expect(host.querySelector('[data-prolit-light]')!.textContent).toBe('');
  });
  it('rejects a light-only host before creating a competing root', async () => {
    class Invalid extends withProlitLightDom(LitElement) {
      protected override createRenderRoot() {
        return this;
      }
      protected override render() {
        return html`existing`;
      }
    }
    customElements.define('prolit-test-invalid-root', Invalid);
    const host = new Invalid();
    document.body.append(host);
    await expect(host.updateComplete).rejects.toThrow('separate ShadowRoot');
    expect(host.querySelector('[data-prolit-light]')).toBeNull();
  });
});
