// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../../index';
import { tj_loader_state_internal } from '../../lib/tj-loader-state';

describe('tj-scroll-restore', () => {
  let element: HTMLElement;
  let loader: HTMLElement;
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    vi.stubGlobal('scrollY', 0);
    sessionStorage.clear();
    history.replaceState(null, '', '/page');
    tj_loader_state_internal.state = 'loading';
    loader = document.createElement('tj-loader');
    element = document.createElement('tj-scroll-restore');
    document.body.append(loader, element);
  });

  afterEach(() => {
    element.remove();
    loader.remove();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  async function visual() {
    tj_loader_state_internal.state = 'visual';
    loader.dispatchEvent(new Event('loader:visual'));
    await Promise.resolve();
    await Promise.resolve();
  }

  it('waits for the loader and restores only the same URL', async () => {
    sessionStorage.setItem('scroll-position1', JSON.stringify({ url: location.href, scrollTop: 420 }));
    expect(scrollTo).not.toHaveBeenCalled();
    await visual();
    expect(scrollTo).toHaveBeenCalledWith({ top: 420, left: 0, behavior: 'instant' });
  });

  it('starts at the top when the stored URL differs', async () => {
    sessionStorage.setItem('scroll-position1', JSON.stringify({ url: location.origin + '/other', scrollTop: 420 }));
    await visual();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('finds a late-rendered anchor even when no position was stored', async () => {
    history.replaceState(null, '', '/page#section%20one');
    const target = document.createElement('section');
    target.id = 'section one';
    target.scrollIntoView = vi.fn();
    document.body.append(target);
    await visual();
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('saves the final position on pagehide and handles later hash changes', async () => {
    await visual();
    vi.stubGlobal('scrollY', 875);
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(sessionStorage.getItem('scroll-position1')!)).toEqual({ url: location.href, scrollTop: 875 });
    const target = document.createElement('div');
    target.id = 'destination';
    target.scrollIntoView = vi.fn();
    document.body.append(target);
    history.pushState(null, '', '/page#destination');
    window.dispatchEvent(new Event('hashchange'));
    expect(target.scrollIntoView).toHaveBeenCalledOnce();
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('smooth-scrolls same-page links without the browser jumping first', async () => {
    await visual();
    const target = document.createElement('section');
    target.id = 'same-page';
    target.scrollIntoView = vi.fn();
    const link = document.createElement('a');
    link.href = '#same-page';
    link.textContent = 'Jump';
    document.body.append(target, link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(location.hash).toBe('#same-page');
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });
});
