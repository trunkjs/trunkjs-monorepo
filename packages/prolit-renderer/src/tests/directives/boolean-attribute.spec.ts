import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('boolean attribute (?attr)', () => {
  it('toggles presence of attribute', () => {
    const { e, render } = createTest(`<div><button ?disabled="isBusy">Save</button></div>`, { isBusy: true });

    render();
    const btn = e.querySelector('button')!;
    expect(btn.hasAttribute('disabled')).toBe(true);

    // flip off
    btn as any; // no-op to keep TS calm in some environments
  });

  it('re-renders and updates boolean attribute correctly', () => {
    const { e, sc, render } = createTest(`<div><button ?disabled="isBusy">Save</button></div>`, { isBusy: false });

    render();
    const btn = e.querySelector('button')!;
    expect(btn.hasAttribute('disabled')).toBe(false);

    sc.isBusy = true;
    render();
    expect(btn.hasAttribute('disabled')).toBe(true);

    sc.isBusy = false;
    render();
    expect(btn.hasAttribute('disabled')).toBe(false);
  });
});
