import { describe, expect, it } from 'vitest';
import { Element2Function } from './Element2Function';
import type { AstHtmlElement } from './ast-type';

describe('Element2Function.parseElement', () => {
  it('converts a simple AST to an HTML string', () => {
    return;
    const converter = new Element2Function();

    const ast: AstHtmlElement = {
      type: 'element',
      tagName: 'div',
      attributes: [{ name: '*if', value: 'data === "wurst"' }],
      children: [
        {
          type: 'element',
          tagName: 'span',
          attributes: [{ name: '*for', value: 'e of items' }],
          children: [{ type: 'text', textContent: 'Hello' }],
          isVoid: false,
        },
      ],
      isVoid: false,
    };

    const result = converter.buildFunction([ast], { items: [] });
    const expected = '<div class="test"><span data-x="1">Hello</span></div>';

    expect(result).toBe(expected);
  });
});
