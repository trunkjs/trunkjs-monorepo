import { Listen } from '@trunkjs/browser-utils';
import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProlitElement } from './ProlitElement';

class ShadowCounter extends ProlitElement {
  readonly state = scopeDefine({ count: 0, $tpl: prolit_html`<button @click="count++">{{ count }}</button>` });
  readonly onResize = vi.fn();

  constructor() {
    super();
    this.scope = this.state;
    this.on('resize', this.onResize, { target: 'window' });
  }

  @Listen('click', { target: 'host' })
  onHostClick() {
    this.state.count++;
  }
}
customElements.define('prolit-test-shadow-counter', ShadowCounter);

class LightCounter extends ProlitElement {
  readonly state = scopeDefine({ title: 'Ada', $tpl: prolit_html`<p>{{ title }}</p>` });

  constructor() {
    super();
    this.scope = this.state;
  }

  protected override createRenderRoot() {
    return this;
  }
}
customElements.define('prolit-test-light-counter', LightCounter);

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('ProlitElement', () => {
  it('renders in shadow DOM, updates its scope and reconnects the event API', async () => {
    const element = new ShadowCounter();
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot?.querySelector('button')?.textContent).toBe('0');
    element.state.count = 2;
    await Promise.resolve();
    await Promise.resolve();
    expect(element.shadowRoot?.querySelector('button')?.textContent).toBe('2');
    window.dispatchEvent(new Event('resize'));
    expect(element.onResize).toHaveBeenCalledTimes(1);
    element.remove();
    window.dispatchEvent(new Event('resize'));
    expect(element.onResize).toHaveBeenCalledTimes(1);
    document.body.append(element);
    await element.updateComplete;
    window.dispatchEvent(new Event('resize'));
    expect(element.onResize).toHaveBeenCalledTimes(2);
  });

  it('renders into light DOM and replaces the scope reactively', async () => {
    const element = new LightCounter();
    document.body.append(element);
    await element.updateComplete;
    expect(element.shadowRoot).toBeNull();
    expect(element.querySelector('p')?.textContent).toBe('Ada');
    element.scope = scopeDefine({ title: 'Linus', $tpl: prolit_html`<p>{{ title }}</p>` });
    await element.updateComplete;
    expect(element.querySelector('p')?.textContent).toBe('Linus');
  });
});
