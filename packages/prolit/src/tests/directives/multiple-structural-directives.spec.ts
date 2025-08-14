import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTest } from '../utils/createTest';

function getLiTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('ul > li')).map((li) => (li.textContent ?? '').trim());
}

describe('multiple structural directives on the same element', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('*if and *for together gate the loop by the condition (order: *if then *for)', () => {
    const { e, sc, render } = createTest(
      `<ul>
        <li *if="show" *for="t of todos">{{ t }}</li>
      </ul>`,
      { show: true, todos: ['a', 'b'] },
    );

    render();
    expect(getLiTexts(e)).toEqual(['a', 'b']);

    sc.show = false;
    render();
    expect(getLiTexts(e)).toEqual([]);

    sc.show = true;
    render();
    expect(getLiTexts(e)).toEqual(['a', 'b']);
  });

  it('*if and *for together gate the loop by the condition (order: *for then *if)', () => {
    const { e, sc, render } = createTest(
      `<ul>
        <li *for="t of todos" *if="show">{{ t }}</li>
      </ul>`,
      { show: false, todos: ['x', 'y'] },
    );

    render();
    expect(getLiTexts(e)).toEqual([]);

    sc.show = true;
    render();
    expect(getLiTexts(e)).toEqual(['x', 'y']);

    sc.show = false;
    render();
    expect(getLiTexts(e)).toEqual([]);
  });

  it('multiple *for in same element', () => {
    // Possible becaus we have a tokenizer that allows multiple *for and *if and *on directives in the same element. (Intrepreted from left to right)
    const { e, render } = createTest(
      `<ul>
        <li *for="t of todos" *for="u of t.users">{{$index}}:{{ u }}</li>
      </ul>`,
      { todos: [{ users: ['a', 'b'] }, { users: ['c', 'd'] }] },
    );

    render();
    expect(getLiTexts(e)).toEqual(['0:a', '1:b', '0:c', '1:d']);
  });

  it('*do with *if executes only when condition is true', () => {
    const { e, sc, render } = createTest(
      `<div>
        <p *if="flag" *do="g = 'OK'">{{ g }}</p>
      </div>`,
      { flag: false as boolean },
    );

    render();
    expect(e.querySelector('p')).toBeNull();

    sc.flag = true;
    render();
    expect(e.querySelector('p')?.textContent?.trim()).toBe('OK');

    sc.flag = false;
    render();
    expect(e.querySelector('p')).toBeNull();
  });

  it('*log with *if logs only when condition is true (order: *if then *log)', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { e, sc, render } = createTest(
      `<div>
        <span *if="show" *log="msg">{{ msg }}</span>
      </div>`,
      { show: false, msg: 'Hello' },
    );

    render();
    expect(spy).not.toHaveBeenCalled();
    expect(e.querySelector('span')).toBeNull();

    sc.show = true;
    render();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Hello');
    expect(e.querySelector('span')?.textContent?.trim()).toBe('Hello');
  });

  it('*log with *for logs once per iteration', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { e, sc, render } = createTest(
      `<ul>
        <li  *for="t of todos" *log="t">{{ t }}</li>
      </ul>`,
      { todos: ['A', 'B'] },
    );

    render();
    expect(getLiTexts(e)).toEqual(['A', 'B']);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, 'A');
    expect(spy).toHaveBeenNthCalledWith(2, 'B');

    sc.todos.push('C');
    render();
    expect(getLiTexts(e)).toEqual(['A', 'B', 'C']);
    expect(spy).toHaveBeenCalledTimes(5);
    expect(spy).toHaveBeenLastCalledWith('C');
  });
});
