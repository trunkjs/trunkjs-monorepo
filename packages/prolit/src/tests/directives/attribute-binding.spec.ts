import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('attribute interpolation', () => {
  it('renders quoted attribute with interpolation', () => {
    const { e, render } = createTest(`<div title="Hello, {{ name }}!"></div>`, { name: 'Alice' });

    render();
    const div = e.querySelector('div')!;
    expect(div.getAttribute('title')).toBe('Hello, Alice!');
  });

  it('updates attribute when scope changes after re-render', () => {
    const { e, sc, render } = createTest(`<div title="User: {{ name }}"></div>`, { name: 'Bob' });

    render();
    const div = e.querySelector('div')!;
    expect(div.getAttribute('title')).toBe('User: Bob');

    sc.name = 'Carol';
    render();
    expect(div.getAttribute('title')).toBe('User: Carol');
  });
});
