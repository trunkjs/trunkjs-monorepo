// @vitest-environment jsdom
import { html, LitElement } from 'lit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMultiQuerySelectAll } from '../lib/multiQuerySelectAll';
import { SubLayoutApplyMixin } from './SubLayoutApplyMixin';

class SelectorPriorityTestElement extends SubLayoutApplyMixin(LitElement) {
  protected override render() {
    return html`
      <slot name="early" data-query="@var(--test-early-selector) | :scope > .early"></slot>
      <slot name="late" data-query=":scope > .late"></slot>
    `;
  }
}

class SelectorErrorIsolationTestElement extends SubLayoutApplyMixin(LitElement) {
  protected override render() {
    return html`
      <slot name="broken" data-query="@var(--broken-selector)"></slot>
      <slot name="survivor" data-query=":scope > .survivor"></slot>
    `;
  }
}

if (!customElements.get('selector-priority-test')) {
  customElements.define('selector-priority-test', SelectorPriorityTestElement);
}
if (!customElements.get('selector-error-isolation-test')) {
  customElements.define('selector-error-isolation-test', SelectorErrorIsolationTestElement);
}

function createRoot(htmlContent: string) {
  const root = document.createElement('div');
  root.innerHTML = htmlContent;
  document.body.append(root);
  return root;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('resolveMultiQuerySelectAll', () => {
  it('uses the first literal selector that has matches', () => {
    const root = createRoot('<span class="fallback"></span><span class="fallback"></span>');
    const result = resolveMultiQuerySelectAll(':scope > .missing | :scope > .fallback', root);

    expect(result.source).toBe('selector');
    expect(result.elements).toHaveLength(2);
    root.remove();
  });

  it('resolves a selector from a CSS variable', () => {
    const root = createRoot('<span class="custom"></span>');
    root.style.setProperty('--test-selector', ':scope > .custom');
    const result = resolveMultiQuerySelectAll('@var(--test-selector) | :scope > .fallback', root);

    expect(result.source).toBe('variable');
    expect(result.elements[0]).toBe(root.firstElementChild);
    root.remove();
  });

  it('uses the next alternative when the CSS variable is missing, empty, or has no matches', () => {
    const root = createRoot('<span class="fallback"></span>');

    expect(resolveMultiQuerySelectAll('@var(--missing) | .fallback', root).source).toBe('selector');

    root.style.setProperty('--empty', ' ');
    expect(resolveMultiQuerySelectAll('@var(--empty) | .fallback', root).source).toBe('selector');

    root.style.setProperty('--no-match', '.missing');
    expect(resolveMultiQuerySelectAll('@var(--no-match) | .fallback', root).source).toBe('selector');
    root.remove();
  });

  it('supports selector lists in a CSS variable without parsing them as alternatives', () => {
    const root = createRoot('<span class="one"></span><span class="two"></span>');
    root.style.setProperty('--test-selector', ':scope > .one, :scope > .two');
    const result = resolveMultiQuerySelectAll('@var(--test-selector)', root);

    expect(result.elements).toHaveLength(2);
    root.remove();
  });

  it('reports malformed variable expressions and continues with the next alternative', () => {
    const root = createRoot('<span></span>');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(resolveMultiQuerySelectAll('@var(test-selector) | span', root).source).toBe('selector');
    expect(resolveMultiQuerySelectAll('@var(--test-selector | span', root).source).toBe('selector');
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(String(consoleError.mock.calls[0][0])).toMatch(/Expected @var\(--custom-property\)/);
    expect(String(consoleError.mock.calls[1][0])).toMatch(/Invalid CSS variable selector/);
    expect(consoleError.mock.calls.every((call) => call[1] === root)).toBe(true);
  });

  it('reports an invalid resolved selector and continues with the fallback', () => {
    const root = createRoot('<span></span>');
    root.style.setProperty('--broken-selector', '[');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = resolveMultiQuerySelectAll('@var(--broken-selector) | span', root);

    expect(result.source).toBe('selector');
    expect(result.elements[0]).toBe(root.firstElementChild);
    expect(consoleError).toHaveBeenCalledOnce();
    expect(String(consoleError.mock.calls[0][0])).toMatch(
      /Invalid CSS selector "\[" resolved from @var\(--broken-selector\)/,
    );
    expect(consoleError.mock.calls[0][1]).toBe(root);
  });

  it('reports invalid and empty literal alternatives without aborting the query', () => {
    const root = createRoot('<span></span>');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = resolveMultiQuerySelectAll('[ | | span', root);

    expect(result.source).toBe('selector');
    expect(result.elements[0]).toBe(root.firstElementChild);
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(String(consoleError.mock.calls[0][0])).toMatch(/Invalid CSS selector "\["/);
    expect(String(consoleError.mock.calls[1][0])).toMatch(/Empty selector alternative/);
  });
});

describe('SubLayoutApplyMixin selector priority', () => {
  it('applies CSS-variable assignments after built-in selector assignments', async () => {
    const element = document.createElement('selector-priority-test') as SelectorPriorityTestElement;
    const child = document.createElement('div');
    child.classList.add('late');
    element.style.setProperty('--test-early-selector', ':scope > .late');
    element.append(child);
    document.body.append(element);

    await element.updateComplete;

    expect(child.getAttribute('slot')).toBe('early');
    element.remove();
  });

  it('continues processing later slots after a selector error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const element = document.createElement('selector-error-isolation-test') as SelectorErrorIsolationTestElement;
    const child = document.createElement('div');
    child.classList.add('survivor');
    element.style.setProperty('--broken-selector', '[');
    element.append(child);
    document.body.append(element);

    await expect(element.updateComplete).resolves.toBe(true);

    expect(child.getAttribute('slot')).toBe('survivor');
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError.mock.calls[0][1]).toBe(element);
  });
});
