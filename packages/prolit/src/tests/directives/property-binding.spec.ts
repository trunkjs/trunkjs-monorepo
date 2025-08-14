import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('property binding (.prop)', () => {
  it('sets element property (not attribute)', () => {
    const { e, render } = createTest(`<div><input .value="name"></div>`, { name: 'Alice' });

    render();
    const input = e.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Alice');
    // attribute should not necessarily be present or match
    expect(input.getAttribute('value')).not.toBe('Alice');
  });

  it('updates property on re-render when scope changes', () => {
    const { e, sc, render } = createTest(`<div><input .value="name"></div>`, { name: 'First' });

    render();
    const input = e.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('First');

    sc.name = 'Second';
    render();
    expect(input.value).toBe('Second');
  });
});
