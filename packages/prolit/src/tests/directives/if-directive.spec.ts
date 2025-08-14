import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('*if directive', () => {
  it('renders content only when condition is truthy', () => {
    const { e, render } = createTest(`<div><p *if="flag">Visible</p></div>`, { flag: true });

    render();
    expect(e.querySelector('p')?.textContent?.trim()).toBe('Visible');
  });

  it('does not render content when condition is falsy', () => {
    const { e, render } = createTest(`<div><p *if="flag">Hidden</p></div>`, { flag: false });

    render();
    expect(e.querySelector('p')).toBeNull();
  });

  it('updates on re-render when condition changes', () => {
    const { e, sc, render } = createTest(`<div><p *if="flag">Toggle</p></div>`, { flag: false });

    render();
    expect(e.querySelector('p')).toBeNull();

    sc.flag = true;
    render();
    expect(e.querySelector('p')?.textContent?.trim()).toBe('Toggle');

    sc.flag = false;
    render();
    expect(e.querySelector('p')).toBeNull();
  });
});
