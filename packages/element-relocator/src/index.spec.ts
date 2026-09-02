import { afterEach, describe, expect, it, vi } from 'vitest';
import './index';

function setup() {
  document.body.innerHTML = `
    <nte-nav-2 id="source">
      <nte-nav-item href="/one">One</nte-nav-item>
      <nte-nav-item href="/two">Two</nte-nav-item>
    </nte-nav-2>
    <nte-nav-2 id="target"></nte-nav-2>
    <tj-element-relocator source="#source" target="#target"></tj-element-relocator>
  `;

  return {
    source: document.querySelector('#source')!,
    target: document.querySelector('#target')!,
    relocator: document.querySelector('tj-element-relocator')!,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('tj-element-relocator', () => {
  it('moves source children to the target while relocated', () => {
    const { source, target, relocator } = setup();

    relocator.classList.add('relocate');

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);
    expect(target.children[0].getAttribute('href')).toBe('/one');
  });

  it('moves the items back to the source when relocation is disabled', () => {
    const { source, target, relocator } = setup();

    relocator.classList.add('relocate');
    relocator.classList.remove('relocate');

    expect(target.children).toHaveLength(0);
    expect(source.children).toHaveLength(2);
    expect(source.children[0].getAttribute('href')).toBe('/one');
  });

  it('keeps newly added source items moving while relocated', async () => {
    const { source, target, relocator } = setup();
    relocator.classList.add('relocate');

    source.append(document.createElement('nte-nav-item'));
    await Promise.resolve();
    await Promise.resolve();

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(3);
  });

  it('reacts when responsive tooling toggles the relocate class', () => {
    const { source, target, relocator } = setup();

    relocator.setAttribute('class', 'md:relocate relocate');
    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);

    relocator.setAttribute('class', 'md:relocate');
    expect(source.children).toHaveLength(2);
    expect(target.children).toHaveLength(0);
  });

  it('requires both source and target selectors', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    document.body.innerHTML = '<tj-element-relocator class="relocate" source="#missing"></tj-element-relocator>';

    expect(warn).toHaveBeenCalled();
  });
});
