import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import './tj-include';

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];

  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];

  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
  readonly takeRecords = vi.fn(() => [] as IntersectionObserverEntry[]);

  constructor(private readonly callback: IntersectionObserverCallback) {
    IntersectionObserverMock.instances.push(this);
  }

  intersect(target: Element) {
    this.callback(
      [
        {
          target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: {} as DOMRectReadOnly,
          intersectionRect: {} as DOMRectReadOnly,
          rootBounds: null,
          time: 0,
        },
      ],
      this as unknown as IntersectionObserver,
    );
  }
}

const nextMicrotask = () => Promise.resolve();

describe('tj-include', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    IntersectionObserverMock.instances = [];
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loads src immediately by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('<h2>Hello</h2>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/content.html');
    document.body.append(include);

    await vi.waitFor(() => expect(include.querySelector('h2')?.textContent).toBe('Hello'));
    expect(fetchMock).toHaveBeenCalledWith('/content.html');
  });

  it('does not load lazy content before it intersects', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    const fetchMock = vi.fn().mockResolvedValue(new Response('<p>Lazy</p>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/lazy.html');
    include.setAttribute('lazy', '');
    document.body.append(include);

    await nextMicrotask();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(IntersectionObserverMock.instances).toHaveLength(1);
  });

  it('loads lazy content when it intersects', async () => {
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
    const fetchMock = vi.fn().mockResolvedValue(new Response('<p>Lazy</p>', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/lazy.html');
    include.setAttribute('lazy', '');
    document.body.append(include);

    await nextMicrotask();
    IntersectionObserverMock.instances[0].intersect(include);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/lazy.html'));
    await vi.waitFor(() => expect(include.querySelector('p')?.textContent).toBe('Lazy'));
  });

  it('reflects loading while the request is pending', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/content.html');
    document.body.append(include);

    await vi.waitFor(() => expect(include.hasAttribute('loading')).toBe(true));

    resolveFetch(new Response('<p>Done</p>', { status: 200 }));
    await vi.waitFor(() => expect(include.hasAttribute('loading')).toBe(false));
  });

  it('shows a custom loader while loading', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/content.html');

    const loader = document.createElement('div');
    loader.setAttribute('slot', 'loader');
    loader.hidden = true;
    loader.textContent = 'Please wait';
    include.append(loader);
    document.body.append(include);

    await vi.waitFor(() => expect(loader.hidden).toBe(false));

    resolveFetch(new Response('<p>Done</p>', { status: 200 }));
    await vi.waitFor(() => expect(include.querySelector('p')?.textContent).toBe('Done'));
  });

  it('shows the default loader when no custom loader exists', async () => {
    let resolveFetch!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          }),
      ),
    );

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/content.html');
    include.style.setProperty('--tj-include-loader-text', 'Working');
    document.body.append(include);

    await vi.waitFor(() => {
      const loader = include.querySelector('[data-tj-include-loader]');
      expect(loader?.textContent).toBe('Working');
    });

    resolveFetch(new Response('<p>Done</p>', { status: 200 }));
    await vi.waitFor(() => expect(include.querySelector('[data-tj-include-loader]')).toBeNull());
  });

  it('replaces itself with fetched nodes when unwrap is set', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<h2>Remote title</h2><p>Remote body</p><div class="footer">Actions</div>', { status: 200 }),
      ),
    );

    const wrapper = document.createElement('div');
    const include = document.createElement('tj-include');
    include.setAttribute('src', '/dialog.html');
    include.setAttribute('unwrap', '');
    wrapper.append(include);
    document.body.append(wrapper);

    await vi.waitFor(() => expect(wrapper.querySelector('tj-include')).toBeNull());
    expect(wrapper.querySelector(':scope > h2')?.textContent).toBe('Remote title');
    expect(wrapper.querySelector(':scope > p')?.textContent).toBe('Remote body');
    expect(wrapper.querySelector(':scope > .footer')?.textContent).toBe('Actions');
  });

  it('emits loadstart and load', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<p>Done</p>', { status: 200 })));

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/content.html');
    const loadstart = vi.fn();
    const load = vi.fn();
    include.addEventListener('loadstart', loadstart);
    include.addEventListener('load', load);

    document.body.append(include);

    await vi.waitFor(() => expect(load).toHaveBeenCalledOnce());
    expect(loadstart).toHaveBeenCalledOnce();
  });

  it('emits error and clears loading for failed requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404, statusText: 'Not Found' })),
    );

    const include = document.createElement('tj-include');
    include.setAttribute('src', '/missing.html');
    const error = vi.fn();
    include.addEventListener('error', error);

    document.body.append(include);

    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());
    expect(include.hasAttribute('loading')).toBe(false);
  });
});
