// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { applyLayout } from './apply-layout';

describe('applyLayout', () => {
  it('does not duplicate selector classes that already exist on the original element', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="foo existing" layout="section.foo.bar">Content</div>';

    applyLayout(Array.from(root.children), { recursive: false });

    const replacement = root.firstElementChild as HTMLElement;
    expect(replacement.tagName).toBe('SECTION');
    expect(replacement.className).toBe('foo existing bar');
  });

  it('removes layout from replacement elements so reruns do not apply the same layout twice', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div layout="section.foo"><span>Content</span></div>';

    applyLayout(Array.from(root.children), { recursive: true });
    applyLayout(Array.from(root.children), { recursive: true });

    const replacement = root.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(1);
    expect(replacement.tagName).toBe('SECTION');
    expect(replacement.getAttribute('layout')).toBeNull();
    expect(replacement.getAttribute('layoutOrig')).toBe('section.foo');
    expect(replacement.className).toBe('foo');
    expect(replacement.textContent).toBe('Content');
  });
});
