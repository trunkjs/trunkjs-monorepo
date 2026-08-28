// @vitest-environment jsdom
import { html, LitElement } from 'lit';
import { describe, expect, it } from 'vitest';
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

if (!customElements.get('selector-priority-test')) {
  customElements.define('selector-priority-test', SelectorPriorityTestElement);
}

function createRoot(htmlContent: string) {
  const root = document.createElement('div');
  root.innerHTML = htmlContent;
  document.body.append(root);
  return root;
}

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

  it('throws a descriptive error for malformed variable expressions', () => {
    const root = createRoot('<span></span>');

    expect(() => resolveMultiQuerySelectAll('@var(test-selector)', root)).toThrow(
      /Expected @var\(--custom-property\)/,
    );
    expect(() => resolveMultiQuerySelectAll('@var(--test-selector', root)).toThrow(/Invalid CSS variable selector/);
    root.remove();
  });

  it('reports the variable name and resolved value for invalid CSS selectors', () => {
    const root = createRoot('<span></span>');
    root.style.setProperty('--broken-selector', '[');

    expect(() => resolveMultiQuerySelectAll('@var(--broken-selector) | span', root)).toThrow(
      /Invalid CSS selector "\[" resolved from @var\(--broken-selector\)/,
    );
    root.remove();
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
});
