// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { TextBlockPreParser } from './TextBlockPreParser';

describe('TextBlockPreParser', () => {
  function parse(markup: string): HTMLElement {
    const root = document.createElement('div');
    root.innerHTML = markup;
    new TextBlockPreParser().parse(root);
    return root;
  }

  it('creates an element from a text-block shortcut with quoted attributes', () => {
    const root = parse('<p>#[nte-input type="text" name="name" label="Name" required]</p>');
    const input = root.querySelector('nte-input');

    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('text');
    expect(input?.getAttribute('name')).toBe('name');
    expect(input?.getAttribute('label')).toBe('Name');
    expect(input?.hasAttribute('required')).toBe(true);
  });

  it('normalizes typographic quotes in text-block attributes', () => {
    const root = parse('<p>#[nte-input type=”text” name=”name” label=”Name” required]</p>');
    const input = root.querySelector('nte-input');

    expect(input).not.toBeNull();
    expect(input?.getAttribute('type')).toBe('text');
    expect(input?.getAttribute('name')).toBe('name');
    expect(input?.getAttribute('label')).toBe('Name');
  });

  it('normalizes HTML-escaped quotes after innerHTML serialization', () => {
    const root = parse('<p>#[nte-input type=&quot;email&quot; name=&quot;email&quot;]</p>');
    const input = root.querySelector('nte-input');

    expect(input?.getAttribute('type')).toBe('email');
    expect(input?.getAttribute('name')).toBe('email');
  });

  it('parses one shortcut per line in a text node', () => {
    const root = parse(
      '<p>#[nte-input type="text" name="name"]\n#[nte-input type="email" name="email"]</p>',
    );

    expect(root.querySelectorAll('nte-input')).toHaveLength(2);
    expect(root.querySelector('nte-input[name="email"]')).not.toBeNull();
  });

  it('uses content after > as the element content', () => {
    const root = parse('<p>#[button type="submit" class="btn btn-primary" > Absenden]</p>');
    const button = root.querySelector('button');

    expect(button?.getAttribute('type')).toBe('submit');
    expect(button?.classList.contains('btn-primary')).toBe(true);
    expect(button?.textContent).toBe('Absenden');
  });
});
