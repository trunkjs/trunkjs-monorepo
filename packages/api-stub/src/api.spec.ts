import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './api';
import type { ApiRoute, RouteTable } from './types';

type TestApi = {
  Test: {
    Get: ApiRoute<Record<string, never>, Record<string, never>, never, string, 'GET'>;
  };
};

const routes = {
  'Test.Get': ['GET', '/api/test'],
} as const satisfies RouteTable;

describe('createApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ignores legacy API and application base metadata', () => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) =>
        ['meta[name="api-base-url"]', 'meta[name="api-base-path"]', 'meta[name="app-base-path"]'].includes(selector)
          ? { content: '/legacy/' } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/api/test');
  });

  it.each(['/wurst', '/wurst/'])('uses the application URL prefix %s', (prefix) => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => selector === 'meta[name="app-url-prefix"]' ? { content: prefix } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/wurst/api/test');
  });

  it.each(['', '/'])('uses root-relative URLs for an empty or root prefix', (prefix) => {
    vi.stubGlobal('document', {
      querySelector: (selector: string) => selector === 'meta[name="app-url-prefix"]' ? { content: prefix } : null,
    });

    expect(createApi<TestApi>(routes).Test.Get.url()).toBe('/api/test');
  });

  it('allows an explicit base URL to override metadata', () => {
    vi.stubGlobal('document', {
      querySelector: () => ({ content: '/wurst' }),
    });

    expect(createApi<TestApi>(routes, { baseUrl: 'https://other-api.example.test' }).Test.Get.url())
      .toBe('https://other-api.example.test/api/test');
  });
});


describe('request concurrency', () => {
  afterEach(() => vi.unstubAllGlobals());

  function delayedFetch() {
    const resolve: ((response: Response) => void)[] = [];
    const fetch = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((done, reject) => {
      resolve.push(done);
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    vi.stubGlobal('fetch', fetch);
    return { fetch, resolve };
  }

  it('shares an in-flight result across derived proxies, but not completed requests', async () => {
    const { fetch, resolve } = delayedFetch();
    const api = createApi<TestApi>(routes, { concurrency: 'join' });
    const a = api.Test.Get.request();
    const b = api.Test.Get.with({}).request();
    expect(fetch).toHaveBeenCalledOnce();
    resolve[0](new Response('"shared"'));
    await expect(Promise.all([a, b])).resolves.toEqual(['shared', 'shared']);
    const c = api.Test.Get.request();
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve[1](new Response('"new"'));
    await expect(c).resolves.toBe('new');
  });

  it('rejects a duplicate even if the first call used parallel mode', async () => {
    const { fetch, resolve } = delayedFetch();
    const api = createApi<TestApi>(routes);
    const a = api.Test.Get.request({ concurrency: 'parallel' });
    await expect(api.Test.Get.request({ concurrency: 'reject' })).rejects.toThrow('already in progress');
    expect(fetch).toHaveBeenCalledOnce();
    resolve[0](new Response('"ok"'));
    await a;
  });

  it('aborts matching calls and starts a replacement', async () => {
    const { fetch, resolve } = delayedFetch();
    const api = createApi<TestApi>(routes);
    const a = api.Test.Get.request({ concurrency: 'parallel' });
    const b = api.Test.Get.request({ concurrency: 'parallel' });
    const rejected = Promise.all([
      expect(a).rejects.toMatchObject({ name: 'AbortError' }),
      expect(b).rejects.toMatchObject({ name: 'AbortError' }),
    ]);
    const c = api.Test.Get.request({ concurrency: 'abort' });
    expect(fetch).toHaveBeenCalledTimes(3);
    resolve[2](new Response('"replacement"'));
    await rejected;
    await expect(c).resolves.toBe('replacement');
  });

  it('does not join requests with different headers, body or method', async () => {
    type Routes = { Save: ApiRoute<{}, {}, { value: number }, string, 'POST' | 'PUT'> };
    const { fetch, resolve } = delayedFetch();
    const api = createApi<Routes>({ Save: [['POST', 'PUT'], '/save'] }, { concurrency: 'join' });
    const a = api.Save.request({ body: { value: 1 } });
    const b = api.Save.request({ body: { value: 2 } });
    const c = api.Save.request({ body: { value: 1 }, options: { headers: { Authorization: 'other' } } });
    const d = api.Save.request({ method: 'PUT', body: { value: 1 } });
    expect(fetch).toHaveBeenCalledTimes(4);
    resolve.forEach(done => done(new Response('"ok"')));
    await Promise.all([a, b, c, d]);
  });

  it('respects caller cancellation and cleans up after a shared failure', async () => {
    const { fetch, resolve } = delayedFetch();
    const api = createApi<TestApi>(routes, { concurrency: 'join' });
    const abort = new AbortController();
    const a = api.Test.Get.request({ options: { signal: abort.signal } });
    const b = api.Test.Get.request();
    const rejected = expect(a).rejects.toMatchObject({ name: 'AbortError' });
    const failure = expect(b).rejects.toThrow('503');
    abort.abort();
    await rejected;
    expect(fetch.mock.calls[0][1].signal?.aborted).toBe(false);
    resolve[0](new Response('unavailable', { status: 503 }));
    await failure;
    const c = api.Test.Get.request();
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve[1](new Response('"retry"'));
    await expect(c).resolves.toBe('retry');
  });

  it('queues identical requests by default, warns, and executes in FIFO order', async () => {
    const { fetch, resolve } = delayedFetch();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const route = createApi<TestApi>(routes).Test.Get;
      const a = route.request();
      const b = route.request();
      const c = route.request();
      expect(fetch).toHaveBeenCalledOnce();
      expect(warn).toHaveBeenCalledTimes(2);
      resolve[0](new Response('"first"'));
      await expect(a).resolves.toBe('first');
      expect(fetch).toHaveBeenCalledTimes(2);
      resolve[1](new Response('"second"'));
      await expect(b).resolves.toBe('second');
      expect(fetch).toHaveBeenCalledTimes(3);
      resolve[2](new Response('"third"'));
      await expect(c).resolves.toBe('third');
    } finally {
      warn.mockRestore();
    }
  });

  it('queue-latest keeps the running call and replaces the waiting call', async () => {
    const { fetch, resolve } = delayedFetch();
    const route = createApi<TestApi>(routes, { concurrency: 'queue-latest' }).Test.Get;
    const a = route.request();
    const b = route.request();
    const discarded = expect(b).rejects.toMatchObject({ name: 'AbortError' });
    const c = route.request();
    await discarded;
    expect(fetch).toHaveBeenCalledOnce();
    resolve[0](new Response('"first"'));
    await expect(a).resolves.toBe('first');
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve[1](new Response('"latest"'));
    await expect(c).resolves.toBe('latest');
  });

  it('limits matching parallel requests and releases slots on failure', async () => {
    const { fetch, resolve } = delayedFetch();
    const route = createApi<TestApi>(routes).Test.Get.with({
      concurrency: 'parallel', concurrencyLimit: 2,
    });
    const a = route.request();
    const b = route.request();
    const c = route.request();
    const failed = expect(a).rejects.toThrow('503');
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve[0](new Response('error', { status: 503 }));
    await failed;
    expect(fetch).toHaveBeenCalledTimes(3);
    resolve[1](new Response('"second"'));
    resolve[2](new Response('"third"'));
    await expect(Promise.all([b, c])).resolves.toEqual(['second', 'third']);
    await expect(route.request({ concurrencyLimit: 0 })).rejects.toThrow('positive integer');
  });

  it('cancels a queued call before it sends any HTTP request', async () => {
    const { fetch, resolve } = delayedFetch();
    const route = createApi<TestApi>(routes).Test.Get;
    const a = route.request();
    const abort = new AbortController();
    const b = route.request({ options: { signal: abort.signal } });
    const cancelled = expect(b).rejects.toMatchObject({ name: 'AbortError' });
    const c = route.request();
    abort.abort();
    await cancelled;
    expect(fetch).toHaveBeenCalledOnce();
    resolve[0](new Response('"first"'));
    await a;
    expect(fetch).toHaveBeenCalledTimes(2);
    resolve[1](new Response('"third"'));
    await expect(c).resolves.toBe('third');
  });

});
