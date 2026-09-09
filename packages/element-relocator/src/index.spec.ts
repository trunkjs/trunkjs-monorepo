import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './index';

function setup(className = '') {
  document.body.innerHTML = `
    <nte-nav-2 id="source">
      <nte-nav-item href="/one">One</nte-nav-item>
      <nte-nav-item href="/two">Two</nte-nav-item>
    </nte-nav-2>
    <nte-nav-2 id="target"></nte-nav-2>
    <tj-element-relocator class="${className}" source="#source" target="#target"></tj-element-relocator>
  `;

  return {
    source: document.querySelector('#source')!,
    target: document.querySelector('#target')!,
    relocator: document.querySelector('tj-element-relocator')!,
  };
}

beforeEach(() => {
  vi.stubGlobal('tj_loader_state', 'ready');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('tj-element-relocator', () => {
  it('moves source children to the target while relocated', async () => {
    const { source, target, relocator } = setup();

    relocator.classList.add('relocate');
    await Promise.resolve();

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);
    expect(target.children[0].getAttribute('href')).toBe('/one');
  });

  it('moves the items back to the source when relocation is disabled', async () => {
    const { source, target, relocator } = setup();

    relocator.classList.add('relocate');
    await Promise.resolve();
    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);

    relocator.classList.remove('relocate');
    await Promise.resolve();

    expect(target.children).toHaveLength(0);
    expect(source.children).toHaveLength(2);
    expect(source.children[0].getAttribute('href')).toBe('/one');
  });

  it('keeps newly added source items moving while relocated', async () => {
    const { source, target, relocator } = setup();
    relocator.classList.add('relocate');
    await Promise.resolve();
    expect(target.children).toHaveLength(2);

    source.append(document.createElement('nte-nav-item'));
    await Promise.resolve();
    await Promise.resolve();

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(3);
  });

  it('reacts when responsive tooling toggles the relocate class', async () => {
    const { source, target, relocator } = setup();

    relocator.setAttribute('class', 'md:relocate relocate');
    await Promise.resolve();
    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);

    relocator.setAttribute('class', 'md:relocate');
    await Promise.resolve();
    expect(source.children).toHaveLength(2);
    expect(target.children).toHaveLength(0);
  });

  it('waits for loader:ready before relocating initially active elements', async () => {
    vi.stubGlobal('tj_loader_state', 'loading');
    const { source, target } = setup('relocate');

    await Promise.resolve();
    expect(source.children).toHaveLength(2);
    expect(target.children).toHaveLength(0);

    window.tj_loader_state = 'ready';
    window.dispatchEvent(new Event('loader:ready'));
    await Promise.resolve();

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);
  });

  it('waits for loader:ready before applying attribute changes', async () => {
    const { source, target, relocator } = setup();
    await Promise.resolve();
    vi.stubGlobal('tj_loader_state', 'loading');

    relocator.classList.add('relocate');
    await Promise.resolve();
    expect(source.children).toHaveLength(2);
    expect(target.children).toHaveLength(0);

    window.tj_loader_state = 'ready';
    window.dispatchEvent(new Event('loader:ready'));
    await Promise.resolve();

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);
  });

  it('waits for window load when no loader is present', async () => {
    vi.stubGlobal('tj_loader_state', undefined);
    const readyState = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    const { source, target } = setup('relocate');

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await Promise.resolve();
    expect(source.children).toHaveLength(2);
    expect(target.children).toHaveLength(0);

    readyState.mockReturnValue('complete');
    window.dispatchEvent(new Event('load'));
    await Promise.resolve();

    expect(source.children).toHaveLength(0);
    expect(target.children).toHaveLength(2);
  });

  it('requires both source and target selectors', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    document.body.innerHTML = '<tj-element-relocator class="relocate" source="#missing"></tj-element-relocator>';
    await Promise.resolve();

    expect(warn).toHaveBeenCalled();
  });
});
