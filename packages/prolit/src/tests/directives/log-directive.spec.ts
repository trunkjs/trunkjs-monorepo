import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTest } from '../utils/createTest';

describe('*log directive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs expression result and still renders content', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { e, render } = createTest(`<div *log="name"><span>{{ name }}</span></div>`, { name: 'Alice' });

    render();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('Alice');
    const span = e.querySelector('span');
    expect(span?.textContent?.trim()).toBe('Alice');
  });

  it('supports arbitrary expressions', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { render } = createTest(`<div *log="1 + 1"></div>`, {});

    render();
    expect(spy).toHaveBeenCalledWith(2);
  });
});
