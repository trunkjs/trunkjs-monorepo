import { afterEach, describe, expect, it, vi } from 'vitest';
import './index';

function setup(placement: 'inside' | 'before' | 'after' = 'inside') {
  document.body.innerHTML = `
    <main>
      <span id="before"></span>
      <div id="source" slot="toolbar">Source</div>
      <span id="after"></span>
    </main>
    <section id="destination">
      <tj-element-relocator source="#source" placement="${placement}"></tj-element-relocator>
    </section>
  `;

  return {
    source: document.querySelector('#source')!,
    relocator: document.querySelector('tj-element-relocator')!,
    originalParent: document.querySelector('main')!,
    destination: document.querySelector('#destination')!,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('tj-element-relocator', () => {
  it('relocates the source inside itself and restores its exact position', () => {
    const { source, relocator, originalParent } = setup();

    relocator.classList.add('relocated');
    expect(source.parentElement).toBe(relocator);

    relocator.classList.remove('relocated');
    expect(source.parentElement).toBe(originalParent);
    expect(source.previousElementSibling?.id).toBe('before');
    expect(source.nextElementSibling?.id).toBe('after');
  });

  it('supports sibling placement for slot-compatible light DOM', () => {
    const { source, relocator, destination } = setup('after');

    relocator.classList.add('relocated');
    expect(source.parentElement).toBe(destination);
    expect(relocator.nextElementSibling).toBe(source);
    expect(source.getAttribute('slot')).toBe('toolbar');
  });

  it('reacts when responsive tooling toggles the relocated class', () => {
    const { source, relocator, originalParent } = setup('before');

    relocator.setAttribute('class', 'md:relocated relocated');
    expect(relocator.previousElementSibling).toBe(source);

    relocator.setAttribute('class', 'md:relocated');
    expect(source.parentElement).toBe(originalParent);
  });

  it('warns for plain classes other than relocated', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { relocator } = setup();

    relocator.setAttribute('class', 'md:relocated helper relocated');

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('helper'));
  });
});
