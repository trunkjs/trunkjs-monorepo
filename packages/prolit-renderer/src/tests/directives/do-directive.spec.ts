import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('*do directive', () => {
  it('executes inline code before element content', () => {
    const { e, render } = createTest(`<div *do="x = 41 + 1"><span>{{ x }}</span></div>`, { x: 0 });
    render();
    const span = e.querySelector('span');
    expect(span?.textContent?.trim()).toBe('42');
  });

  it('can initialize local variables used in expressions', () => {
    const { e, render } = createTest(`<div *do="greeting = 'Hello'"><span>{{ greeting }}, {{ name }}!</span></div>`, {
      name: 'World',
    });
    render();
    const span = e.querySelector('span');
    expect(span?.textContent?.trim()).toBe('Hello, World!');
  });

  it('works with *for "in" using the key in *do to define the value', () => {
    const { e, render } = createTest(
      `<ul><li *for="k in obj"><span *do="v = obj[k]">{{ k }}={{ v }}</span></li></ul>`,
      { obj: { a: 1, b: 2 } },
    );
    render();
    const texts = Array.from(e.querySelectorAll('ul > li > span')).map((s) => (s.textContent ?? '').trim());
    expect(texts).toEqual(['a=1', 'b=2']);
  });
});
