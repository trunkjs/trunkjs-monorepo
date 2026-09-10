// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitForReady, waitForPreVisual, waitForVisual } from '../../../../browser-utils/src/lib/wait-for';
import '../../../index';
import type { LoaderElement } from '../../../index';
import { tj_loader_state_internal } from '../../lib/tj-loader-state';

describe('loader lifecycle and debugging', () => {
  let loader: LoaderElement;
  let listeners: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    listeners = vi.spyOn(window, 'addEventListener');
    tj_loader_state_internal.state = 'loading';
    sessionStorage.clear();
    loader = document.createElement('tj-loader') as LoaderElement;
  });

  afterEach(() => {
    for (const [type, listener, options] of listeners.mock.calls) {
      window.removeEventListener(type, listener, options);
    }
    loader.remove();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function start() {
    document.body.append(loader);
    window.dispatchEvent(new Event('DOMContentLoaded'));
  }

  function childEvent(name: string, element: HTMLElement) {
    window.dispatchEvent(new CustomEvent(name, { detail: { element } }));
  }

  it('publishes every phase before its event and resolves early and late waits', async () => {
    document.body.append(loader);
    const phases: string[] = [];
    for (const phase of ['ready', 'pre-visual', 'visual']) {
      window.addEventListener('loader:' + phase, () => {
        expect(window.tj_loader_state).toBe(phase);
        phases.push(phase);
      });
    }
    const ready = vi.fn();
    const preVisual = vi.fn();
    const visual = vi.fn();
    void waitForReady().then(ready);
    void waitForPreVisual().then(preVisual);
    void waitForVisual().then(visual);
    await Promise.resolve();
    expect(ready).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.advanceTimersByTimeAsync(1);
    expect(ready).toHaveBeenCalledOnce();
    expect(preVisual).not.toHaveBeenCalled();
    await waitForReady();

    await vi.advanceTimersByTimeAsync(10);
    expect(preVisual).toHaveBeenCalledOnce();
    expect(visual).not.toHaveBeenCalled();
    await Promise.all([waitForReady(), waitForPreVisual()]);

    await vi.advanceTimersByTimeAsync(151);
    expect(visual).toHaveBeenCalledOnce();
    await Promise.all([waitForReady(), waitForPreVisual(), waitForVisual()]);
    expect(phases).toEqual(['ready', 'pre-visual', 'visual']);
  });

  it.each(['interactive', 'complete'] as const)('starts after DOMContentLoaded when the DOM is %s', async (state) => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue(state);
    document.body.append(loader);
    await vi.advanceTimersByTimeAsync(162);
    expect(window.tj_loader_state).toBe('visual');
    await waitForVisual();
  });

  it('keeps the public state read-only', () => {
    expect(() => { window.tj_loader_state = 'visual'; }).toThrow('Cannot set tj_loader_state directly.');
    expect(window.tj_loader_state).toBe('loading');
  });

  it('starts the phase sequence only once when readiness checks overlap', async () => {
    const ready = vi.fn();
    window.addEventListener('loader:ready', ready);
    start();
    const child = document.createElement('div');
    childEvent('init:child-waitreq', child);
    childEvent('init:child-ready', child);
    await vi.advanceTimersByTimeAsync(1000);
    expect(ready).toHaveBeenCalledOnce();
  });

  it.each([false, true])('logs status only with debug present: %s', async (debug) => {
    if (debug) loader.setAttribute('debug', '');
    document.body.append(loader);
    const child = document.createElement('div');
    childEvent('init:child-waitreq', child);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.advanceTimersByTimeAsync(10);
    expect(window.tj_loader_state).toBe('loading');
    childEvent('init:child-ready', child);
    await vi.advanceTimersByTimeAsync(1000);
    expect(console.debug).toHaveBeenCalledTimes(debug ? 5 : 0);
    expect(window.tj_loader_state).toBe('visual');
  });

  it('checks the debug attribute for each status message', async () => {
    start();
    loader.setAttribute('debug', '');
    await vi.advanceTimersByTimeAsync(1);
    expect(console.debug).toHaveBeenCalledOnce();
    loader.removeAttribute('debug');
    await vi.advanceTimersByTimeAsync(1000);
    expect(console.debug).toHaveBeenCalledOnce();
  });

  it('keeps warnings and timeout errors visible without debug', async () => {
    document.body.append(loader);
    childEvent('init:child-ready', document.createElement('div'));
    expect(console.warn).toHaveBeenCalledOnce();
    const child = document.createElement('div');
    childEvent('init:child-waitreq', child);
    window.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.advanceTimersByTimeAsync(7000);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('more than 4 seconds'), child);
    expect(console.debug).not.toHaveBeenCalled();
    expect(window.tj_loader_state).toBe('visual');
  });
});
