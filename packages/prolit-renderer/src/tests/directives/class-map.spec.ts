import { describe, expect, it } from 'vitest';
import { createTest } from '../utils/createTest';

describe('~class directive (classMap)', () => {
  it('applies classes from an object and updates on re-render', () => {
    const { e, sc, render } = createTest(`<div><span ~class="cls">X</span></div>`, {
      cls: { active: true, disabled: false },
    });

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.classList.contains('active')).toBe(true);
    expect(span.classList.contains('disabled')).toBe(false);

    // enable disabled
    sc.cls.disabled = true;
    render();
    expect(span.classList.contains('active')).toBe(true);
    expect(span.classList.contains('disabled')).toBe(true);

    // disable active
    sc.cls.active = false;
    render();
    expect(span.classList.contains('active')).toBe(false);
    expect(span.classList.contains('disabled')).toBe(true);
  });

  it('works with inline object expression using scope vars', () => {
    const { e, sc, render } = createTest(`<div><span ~class="{ on: isOn, off: !isOn }">Y</span></div>`, {
      isOn: false,
    });

    render();
    const span = e.querySelector('span') as HTMLSpanElement;
    expect(span.classList.contains('on')).toBe(false);
    expect(span.classList.contains('off')).toBe(true);

    sc.isOn = true;
    render();
    expect(span.classList.contains('on')).toBe(true);
    expect(span.classList.contains('off')).toBe(false);
  });
});
