import { html, LitElement, render, type RootPart } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { prolit, prolit_html, scopeDefine, type ProlitScope, type ScopeDiagnostic } from '../../index';

const roots: RootPart[] = [];
function mount(candidate: unknown, fallback?: unknown) {
  const target = document.createElement('section');
  document.body.append(target);
  const part = render(prolit(candidate, fallback), target);
  roots.push(part);
  return { target, part };
}
afterEach(() => {
  roots.splice(0).forEach((part) => part.setConnected(false));
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const tick = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('prolit directive', () => {
  it('renders valid scopes and uses fallback only for invalid or missing scopes', () => {
    for (const value of [undefined, null, {}, { $tpl: prolit_html`<p>fake</p>` }]) {
      const { target } = mount(value, html`<p>Default</p>`);
      expect(target.textContent).toBe('Default');
    }
    expect(mount(undefined).target.textContent).toBe('');
    expect(mount(scopeDefine({ name: 'Ada', $tpl: '<p>{{ name }}</p>' }), 'Default').target.textContent).toBe('Ada');
  });
  it('updates from callbacks, direct template assignments and explicit deep updates', async () => {
    const scope = scopeDefine({
      count: 0,
      values: ['a'],
      $fn: {
        increment: (): void => {
          scope.count++;
        },
      },
      $tpl: prolit_html`<button @click="$fn.increment()">{{ count }}</button><button @click="count++">Direct</button><button @click="values.push('b'); $update()">Deep</button><p>{{ values.join(',') }}</p>`,
    });
    const { target } = mount(scope);
    const buttons = target.querySelectorAll('button');
    buttons[0].click();
    await tick();
    expect(buttons[0].textContent).toBe('1');
    buttons[1].click();
    await tick();
    expect(buttons[0].textContent).toBe('2');
    buttons[2].click();
    await tick();
    expect(target.querySelector('p')!.textContent).toBe('a,b');
    scope.count = 9;
    await tick();
    expect(buttons[0].textContent).toBe('9');
  });
  it('preserves loop locals and supplies $event synchronously', async () => {
    const scope = scopeDefine({
      rows: ['Ada', 'Linus'],
      selected: '',
      $fn: {
        select: (name: string, event: Event): void => {
          scope.selected = name + ':' + (event.currentTarget as HTMLElement).nodeName;
        },
      },
      $tpl: prolit_html`<button *for="name of rows" @click="$fn.select(name, $event)">{{ name }}</button><p>{{ selected }}</p>`,
    });
    const { target } = mount(scope);
    target.querySelectorAll('button')[1].click();
    await tick();
    expect(target.querySelector('p')!.textContent).toBe('Linus:BUTTON');
  });
  it('catches rejected final callbacks after preventDefault without hiding them behind fallback', async () => {
    const cause = new Error('private cause');
    const scope = scopeDefine({
      count: 0,
      $fn: {
        save: async (): Promise<void> => {
          scope.count++;
          throw cause;
        },
      },
      $tpl: prolit_html`<form @submit="$event.preventDefault(); $fn.save()"><button>Save</button></form>`,
    });
    const { target } = mount(scope, 'Default');
    const diagnostics: ScopeDiagnostic[] = [];
    target.addEventListener('scope-error', (event) => diagnostics.push((event as CustomEvent<ScopeDiagnostic>).detail));
    const event = new Event('submit', { bubbles: true, cancelable: true });
    target.querySelector('form')!.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    await tick();
    expect(target.querySelector('[data-prolit-error]')).not.toBeNull();
    expect(target.textContent).not.toContain('Default');
    expect(target.textContent).not.toContain('private cause');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ cause, phase: 'event' });
    expect(diagnostics[0].expression).toContain('$fn.save()');
  });
  it('keeps a synchronous callback failure visible despite a queued earlier mutation', async () => {
    const scope = scopeDefine({
      count: 0,
      $fn: {
        fail: () => {
          throw Error('boom');
        },
      },
      $tpl: prolit_html`<button @click="count++; $fn.fail()">Fail</button>`,
    });
    const { target } = mount(scope);
    target.querySelector('button')!.click();
    await tick();
    expect(target.querySelector('[data-prolit-error]')).not.toBeNull();
  });
  it('diagnoses template errors with original cause and permits recovery through a corrected template', async () => {
    const target = document.createElement('div');
    document.body.append(target);
    const diagnostic = vi.fn();
    target.addEventListener('scope-error', diagnostic);
    const scope = scopeDefine({ name: 'Ada', $tpl: prolit_html`<p>{{ missing.name }}</p>` });
    roots.push(render(prolit(scope, 'Default'), target));
    expect(target.querySelector('[role=alert]')).not.toBeNull();
    expect(target.textContent).not.toContain('Default');
    const detail = diagnostic.mock.calls[0][0].detail;
    expect(detail.cause).toBeInstanceOf(ReferenceError);
    expect(detail.expression).toBe('{{ missing.name }}');
    scope.$tpl = prolit_html`<p>{{ name }}</p>`;
    await tick();
    expect(target.textContent).toBe('Ada');
  });
  it('isolates scopes and transfers ownership on replacement, disconnect and reconnect', async () => {
    const stopA = vi.fn();
    const stopB = vi.fn();
    const startA = vi.fn(() => stopA);
    const startB = vi.fn(() => stopB);
    const a = scopeDefine({ name: 'Ada', $hooks: { $connect: startA }, $tpl: prolit_html`<p>{{ name }}</p>` });
    const b = scopeDefine({ name: 'Linus', $hooks: { $connect: startB }, $tpl: prolit_html`<p>{{ name }}</p>` });
    const { target, part } = mount(a);
    render(prolit(a), target);
    expect(startA).toHaveBeenCalledTimes(1);
    render(prolit(b), target);
    expect(stopA).toHaveBeenCalledTimes(1);
    a.name = 'old';
    await tick();
    expect(target.textContent).toBe('Linus');
    part.setConnected(false);
    part.setConnected(false);
    expect(stopB).toHaveBeenCalledTimes(1);
    b.name = 'new';
    await tick();
    expect(target.textContent).toBe('Linus');
    part.setConnected(true);
    expect(startB).toHaveBeenCalledTimes(2);
    expect(target.textContent).toBe('new');
    render(prolit(undefined, 'Default'), target);
    expect(stopB).toHaveBeenCalledTimes(2);
    expect(target.textContent).toBe('Default');
  });
  it('bubbles initial nested-render errors after the containing template is committed', async () => {
    const target = document.createElement('section');
    document.body.append(target);
    const diagnostic = vi.fn();
    target.addEventListener('scope-error', diagnostic);
    const scope = scopeDefine({ $tpl: prolit_html`<p>{{ missing.name }}</p>` });
    roots.push(render(html`<article>${prolit(scope)}</article>`, target));
    await tick();
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(diagnostic.mock.calls[0][0].detail.phase).toBe('render');
    expect(target.querySelector('article [role=alert]')).not.toBeNull();
  });
  it('rejects a second active mount without disconnecting the first', async () => {
    const stop = vi.fn();
    const scope = scopeDefine({ name: 'Ada', $hooks: { $connect: () => stop }, $tpl: prolit_html`<p>{{ name }}</p>` });
    const first = mount(scope);
    const second = mount(scope, 'Default');
    expect(second.target.querySelector('[data-prolit-error]')).not.toBeNull();
    second.part.setConnected(false);
    expect(stop).not.toHaveBeenCalled();
    scope.name = 'Linus';
    await tick();
    expect(first.target.textContent).toBe('Linus');
  });
  it('does not start hooks for a disconnected root and cleans up thrown hooks', () => {
    const start = vi.fn(() => {
      throw Error('connect');
    });
    const scope = scopeDefine({ $hooks: { $connect: start }, $tpl: prolit_html`<p>Content</p>` });
    const target = document.createElement('div');
    document.body.append(target);
    const part = render(prolit(scope), target, { isConnected: false });
    roots.push(part);
    expect(start).not.toHaveBeenCalled();
    part.setConnected(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(target.querySelector('[data-prolit-error]')).not.toBeNull();
    part.setConnected(false);
    part.setConnected(true);
    expect(start).toHaveBeenCalledTimes(2);
  });
  it('releases scope ownership even when cleanup throws', () => {
    const scope = scopeDefine({
      $hooks: {
        $connect: () => () => {
          throw Error('cleanup');
        },
      },
      $tpl: prolit_html`<p>Content</p>`,
    });
    const { part, target } = mount(scope);
    const diagnostic = vi.fn();
    target.addEventListener('scope-error', diagnostic);
    part.setConnected(false);
    expect(diagnostic).toHaveBeenCalledTimes(1);
    expect(mount(scope).target.textContent).toBe('Content');
  });
});

class ExistingHost extends LitElement {
  static override properties = { contentScope: { attribute: false } };
  declare contentScope?: ProlitScope;
  renders = 0;
  protected override render() {
    this.renders++;
    return html`<article>${prolit(this.contentScope, 'Default')}</article>`;
  }
}
customElements.define('prolit-test-existing-host', ExistingHost);
it('works inside an existing Lit host without updating its outer render cycle', async () => {
  const scope = scopeDefine({ name: 'Ada', $tpl: prolit_html`<p>{{ name }}</p>` });
  const host = new ExistingHost();
  host.contentScope = scope;
  document.body.append(host);
  await host.updateComplete;
  const renders = host.renders;
  scope.name = 'Linus';
  await tick();
  expect(host.shadowRoot!.querySelector('article')!.textContent).toBe('Linus');
  expect(host.renders).toBe(renders);
  host.contentScope = undefined;
  await host.updateComplete;
  expect(host.shadowRoot!.textContent).toContain('Default');
  host.remove();
});
