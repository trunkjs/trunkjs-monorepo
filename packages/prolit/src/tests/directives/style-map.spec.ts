import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('~style directive (style)', () => {
  it('applies styles from an object and updates on re-render', () => {
    const { e, sc, render } = createTest(`<div><span ~style="st">X</span></div>`, { st: { color: 'red' as any } });

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.style.color).toBe('red');

    sc.st.color = 'blue';
    render();
    expect(span.style.color).toBe('blue');

    sc.st.display = 'none';
    render();
    expect(span.style.display).toBe('none');

    // remove property by setting null/undefined
    sc.st.display = null as any;
    render();
    expect(span.style.display).toBe('');
  });

  it('supports camelCase CSS properties like backgroundColor', () => {
    const { e, sc, render } = createTest(`<div><span ~style="{ backgroundColor: bg }">Z</span></div>`, {
      bg: 'rgb(255, 0, 0)',
    });

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.style.backgroundColor).toBe('rgb(255, 0, 0)');

    sc.bg = 'green';
    render();
    expect(span.style.backgroundColor).toBe('green');
  });
});
