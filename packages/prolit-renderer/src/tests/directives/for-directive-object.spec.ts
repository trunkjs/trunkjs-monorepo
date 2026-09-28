import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

function getLiTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
}

describe('*for directive with object (in)', () => {
  it('iterates object keys and renders key=value', () => {
    const { e, render } = createTest(`<ul><li *for="k in obj">{{ k }}={{ obj[k] }}</li></ul>`, { obj: { a: 1, b: 2 } });

    render();
    expect(getLiTexts(e)).toEqual(['a=1', 'b=2']);
  });

  it('exposes $index for object iteration', () => {
    const { e, render } = createTest(`<ul><li *for="key in obj">{{$index}}:{{ key }}={{ obj[key] }}</li></ul>`, {
      obj: { x: 'X', y: 'Y' },
    });

    render();
    expect(getLiTexts(e)).toEqual(['0:x=X', '1:y=Y']);
  });

  it('updates DOM after adding/removing properties and re-rendering', () => {
    const { sc, e, render } = createTest(`<ul><li *for="k in obj">{{ k }}={{ obj[k] }}</li></ul>`, {
      obj: { a: 'A', b: undefined },
    });

    render();
    expect(getLiTexts(e)).toEqual(['a=A', 'b=']); // b is present with undefined value

    // Add new property
    // @ts-expect-error - whatever
    sc.obj.c = 'C';
    render();
    expect(getLiTexts(e)).toEqual(['a=A', 'b=', 'c=C']);

    // Remove a property

    // @ts-expect-error - whatever
    delete sc.obj.a;
    render();
    expect(getLiTexts(e)).toEqual(['b=', 'c=C']);
  });
});
