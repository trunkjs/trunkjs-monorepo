import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

function getLiTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
}

describe('*for directive with array', () => {
  it('renders one element per array item with "*for=\'t of todos\'"', () => {
    const { e, render } = createTest(`<ul><li *for="t of todos">{{ t }}</li></ul>`, { todos: ['a', 'b'] });

    render();
    expect(getLiTexts(e)).toEqual(['a', 'b']);
  });

  it('renders one element per array key with "*for=\'t in todos\'"', () => {
    const { e, render } = createTest(`<ul><li *for="t in todos">{{ todos[t] }}</li></ul>`, { todos: ['a', 'b'] });

    render();
    expect(getLiTexts(e)).toEqual(['a', 'b']);
  });

  it('exposes "index" inside the loop body', () => {
    const { e, render } = createTest(`<ul><li *for="t of todos">{{ $index }}-{{ t }}</li></ul>`, {
      todos: ['x', 'y', 'z'],
    });

    render();
    expect(getLiTexts(e)).toEqual(['0-x', '1-y', '2-z']);
  });

  it('uses loop with key statement (after ;)', () => {
    // Important: Always use a key in the loop to avoid issues with reordering
    const { e, render } = createTest(`<ul><li *for="t of todos; t.id">{{ t.id }}-{{ t.value }}</li></ul>`, {
      todos: [
        { id: 1, value: 'A' },
        { id: 2, value: 'B' },
        { id: 3, value: 'C' },
      ],
    });

    render();
    expect(getLiTexts(e)).toEqual(['1-A', '2-B', '3-C']);
  });

  it('updates DOM after mutating data and calling render() again', () => {
    const { sc, e, render } = createTest(`<ul><li *for="t of todos">{{ t }}</li></ul>`, { todos: ['a'] });

    render();
    expect(getLiTexts(e)).toEqual(['a']);

    // mutate data and re-render
    sc.todos.push('b');
    render();
    expect(getLiTexts(e)).toEqual(['a', 'b']);

    // further mutation
    sc.todos.unshift('0');
    render();
    expect(getLiTexts(e)).toEqual(['0', 'a', 'b']);
  });

  it('throws on invalid *for attribute values not matching "x of y" or "x in y"', () => {
    const { render } = createTest(`<div><span *for="invalid">X</span></div>`, { any: 1 });
    expect(render).toThrow(/Invalid \*for attribute value/i);
  });
});
