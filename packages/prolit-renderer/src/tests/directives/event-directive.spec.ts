import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('@event directive', () => {
  it('handles click event and updates scope', () => {
    const { e, sc, render } = createTest(`<div><button @click="count++">Count: {{ count }}</button></div>`, {
      count: 0,
    });

    render();
    const btn = e.querySelector('button')!;
    expect(btn.textContent?.trim()).toBe('Count: 0');

    btn.click(); // invokes inline handler
    render(); // re-render to reflect updated scope

    expect(btn.textContent?.trim()).toBe('Count: 1');
  });

  it('supports multiple statements in handler', () => {
    const { e, render } = createTest(`<div><button @click="a++; b=a*2">A: {{ a }}, B: {{ b }}</button></div>`, {
      a: 1,
      b: 0,
    });

    render();
    const btn = e.querySelector('button')!;
    expect(btn.textContent?.trim()).toBe('A: 1, B: 0');

    btn.click();
    render();

    expect(btn.textContent?.trim()).toBe('A: 2, B: 4');
  });
});
