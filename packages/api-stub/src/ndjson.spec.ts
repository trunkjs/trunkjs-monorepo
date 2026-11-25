import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './api';
import { createCacheMiddleware } from './middleware';
import type { ApiRoute } from './types';

type Event = { message: string };
type Routes = { Build: { Run: ApiRoute<{}, {}, never, Event, 'GET'> } };
const api = () => createApi<Routes>({ 'Build.Run': ['GET', '/api/stream'] });
const encoder = new TextEncoder();

function openStream(headers: HeadersInit = {}) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(value) { controller = value; },
    cancel,
  });
  const response = new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', ...headers },
  });
  return { controller, response, cancel };
}

function mockFetch(response: Response) {
  const fetch = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('NDJSON streaming', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('delivers parsed objects before EOF, preserving split UTF-8 and CRLF records', async () => {
    const { controller, response } = openStream();
    const fetch = mockFetch(response);
    const onLine = vi.fn<(event: Event) => void>();
    const running = api().Build.Run.ndjson({ onLine });
    const bytes = encoder.encode('{"message":"ä"}\r\n\n{"message":"second"}\n');
    const split = bytes.indexOf(0xc3) + 1;
    controller.enqueue(bytes.slice(0, split));
    controller.enqueue(bytes.slice(split));
    await vi.waitFor(() => expect(onLine).toHaveBeenCalledTimes(2));
    expect(onLine.mock.calls).toEqual([[{ message: 'ä' }], [{ message: 'second' }]]);
    expect(new Headers(fetch.mock.calls[0][1].headers).get('Accept')).toBe('application/x-ndjson');
    controller.close();
    await expect(running).resolves.toBeUndefined();
    expect(response.body?.locked).toBe(false);
  });

  it('awaits asynchronous callbacks and keeps middleware active until EOF', async () => {
    const { controller, response } = openStream();
    mockFetch(response);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const events: string[] = [];
    const running = api().use(async (ctx, next) => {
      expect(ctx.mode).toBe('ndjson');
      events.push('before');
      await next();
      events.push('after');
    }).Build.Run.ndjson({
      onLine: async event => {
        events.push(event.message);
        if (event.message === 'first') await gate;
      },
    });
    controller.enqueue(encoder.encode('{"message":"first"}\n{"message":"second"}\n'));
    controller.close();
    await vi.waitFor(() => expect(events).toEqual(['before', 'first']));
    release();
    await running;
    expect(events).toEqual(['before', 'first', 'second', 'after']);
  });

  it.each([
    ['not json\n', 'Invalid JSON'],
    ['[]\n', 'Expected a JSON object'],
    ['null\n', 'Expected a JSON object'],
    ['{"message":"unfinished"}', 'Incomplete final line'],
  ])('rejects invalid or incomplete data: %s', async (data, message) => {
    mockFetch(new Response(data, { headers: { 'Content-Type': 'application/x-ndjson' } }));
    await expect(api().Build.Run.ndjson({ onLine: vi.fn() })).rejects.toThrow(message);
  });

  it('rejects invalid content type and releases the reader', async () => {
    const { response, cancel } = openStream({ 'Content-Type': 'text/html' });
    mockFetch(response);
    await expect(api().Build.Run.ndjson({ onLine: vi.fn() })).rejects.toThrow('Expected application/x-ndjson');
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('rejects unsuccessful HTTP responses', async () => {
    mockFetch(new Response('unavailable', { status: 503 }));
    await expect(api().Build.Run.ndjson({ onLine: vi.fn() })).rejects.toThrow('503');
  });

  it('warns about compression and buffering without requiring chunked encoding', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { response, controller } = openStream({
      'Content-Encoding': 'gzip',
      'Content-Length': '20',
      'X-Accel-Buffering': 'yes',
    });
    mockFetch(response);
    controller.enqueue(encoder.encode('{"message":"ok"}\n'));
    controller.close();
    const onLine = vi.fn();
    await api().Build.Run.ndjson({ onLine });
    expect(onLine).toHaveBeenCalledWith({ message: 'ok' });
    expect(warn).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('gzip'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Content-Length'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('X-Accel-Buffering'));
  });

  it('warns after an idle interval and clears the timer at EOF', async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { response, controller } = openStream();
    mockFetch(response);
    const running = api().Build.Run.ndjson({ idleWarningMs: 100, onLine: vi.fn() });
    await vi.advanceTimersByTimeAsync(0);
    expect(warn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('No complete record'));
    controller.close();
    await running;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts an active Fetch stream without calling further callbacks', async () => {
    const { response, controller } = openStream();
    const abort = new AbortController();
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      init.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), { once: true });
      return response;
    }));
    const onLine = vi.fn();
    const running = api().Build.Run.ndjson({ onLine, options: { signal: abort.signal } });
    const rejected = expect(running).rejects.toMatchObject({ name: 'AbortError' });
    controller.enqueue(encoder.encode('{"message":"first"}\n'));
    await vi.waitFor(() => expect(onLine).toHaveBeenCalledOnce());
    abort.abort();
    await rejected;
    await vi.waitFor(() => expect(response.body?.locked).toBe(false));
    expect(onLine).toHaveBeenCalledOnce();
  });

  it('runs repeated calls independently despite the GET cache', async () => {
    const fetch = vi.fn(async () => new Response('{"message":"ok"}\n', {
      headers: { 'Content-Type': 'application/x-ndjson' },
    }));
    vi.stubGlobal('fetch', fetch);
    const shared = api().use(createCacheMiddleware().middleware);
    const first = vi.fn();
    const second = vi.fn();
    await Promise.all([
      shared.Build.Run.ndjson({ onLine: first, concurrency: 'parallel' }),
      shared.Build.Run.ndjson({ onLine: second, concurrency: 'parallel' }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(first).toHaveBeenCalledWith({ message: 'ok' });
    expect(second).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('cancels the stream when the callback fails', async () => {
    const { response, controller, cancel } = openStream();
    mockFetch(response);
    controller.enqueue(encoder.encode('{"message":"first"}\n'));
    await expect(api().Build.Run.ndjson({
      onLine: () => { throw new Error('callback failed'); },
    })).rejects.toThrow('callback failed');
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('joins a running stream without replaying old records', async () => {
    const { response, controller } = openStream();
    const fetch = mockFetch(response);
    const shared = api();
    const first = vi.fn();
    const second = vi.fn();
    const a = shared.Build.Run.ndjson({ onLine: first, concurrency: 'join' });
    controller.enqueue(encoder.encode('{"message":"old"}\n'));
    await vi.waitFor(() => expect(first).toHaveBeenCalledOnce());
    const b = shared.Build.Run.ndjson({ onLine: second, concurrency: 'join' });
    controller.enqueue(encoder.encode('{"message":"new"}\n'));
    controller.close();
    await Promise.all([a, b]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(first.mock.calls).toEqual([[{ message: 'old' }], [{ message: 'new' }]]);
    expect(second.mock.calls).toEqual([[{ message: 'new' }]]);
  });

  it('rejects a duplicate until the stream ends', async () => {
    const { response, controller } = openStream();
    const fetch = mockFetch(response);
    const route = api().Build.Run.with({ concurrency: 'reject' });
    const running = route.ndjson({ onLine: vi.fn() });
    await expect(route.ndjson({ onLine: vi.fn() })).rejects.toThrow('already in progress');
    expect(fetch).toHaveBeenCalledOnce();
    controller.close();
    await running;
  });

  it('aborts a previous stream on replacement', async () => {
    const old = openStream();
    const replacement = openStream();
    const fetch = vi.fn()
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        init.signal?.addEventListener('abort', () => old.controller.error(init.signal?.reason), { once: true });
        return old.response;
      })
      .mockResolvedValueOnce(replacement.response);
    vi.stubGlobal('fetch', fetch);
    const route = api().Build.Run;
    const first = vi.fn();
    const a = route.ndjson({ concurrency: 'abort', onLine: first });
    const rejected = expect(a).rejects.toMatchObject({ name: 'AbortError' });
    old.controller.enqueue(encoder.encode('{"message":"old"}\n'));
    await vi.waitFor(() => expect(first).toHaveBeenCalledOnce());
    const second = vi.fn();
    const b = route.ndjson({ concurrency: 'abort', onLine: second });
    replacement.controller.enqueue(encoder.encode('{"message":"new"}\n'));
    replacement.controller.close();
    await Promise.all([rejected, b]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledWith({ message: 'new' });
    expect(first).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(old.response.body?.locked).toBe(false));
  });

  it('cancels only the joined subscriber while others continue', async () => {
    const { response, controller } = openStream();
    const fetch = mockFetch(response);
    const route = api().Build.Run.with({ concurrency: 'join' });
    const abort = new AbortController();
    const first = vi.fn();
    const second = vi.fn();
    const a = route.ndjson({ onLine: first, options: { signal: abort.signal } });
    const rejected = expect(a).rejects.toMatchObject({ name: 'AbortError' });
    const b = route.ndjson({ onLine: second });
    abort.abort();
    await rejected;
    controller.enqueue(encoder.encode('{"message":"remaining"}\n'));
    controller.close();
    await b;
    expect(fetch).toHaveBeenCalledOnce();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ message: 'remaining' });
  });

  it('join-full replays old records before live records, even with async callbacks', async () => {
    const { response, controller } = openStream();
    const fetch = mockFetch(response);
    const route = api().Build.Run.with({ concurrency: 'join-full' });
    const first = vi.fn();
    const a = route.ndjson({ onLine: first });
    controller.enqueue(encoder.encode('{"message":"one"}\n{"message":"two"}\n'));
    await vi.waitFor(() => expect(first).toHaveBeenCalledTimes(2));

    const received: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const b = route.ndjson({ onLine: async event => {
      received.push(event.message);
      if (event.message === 'one') await gate;
    } });
    controller.enqueue(encoder.encode('{"message":"three"}\n'));
    controller.close();
    await vi.waitFor(() => expect(received).toEqual(['one']));
    release();
    await Promise.all([a, b]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(received).toEqual(['one', 'two', 'three']);
  });

  it('join-full rejects late replay when no history was enabled', async () => {
    const { response, controller } = openStream();
    mockFetch(response);
    const route = api().Build.Run;
    const onLine = vi.fn();
    const a = route.ndjson({ concurrency: 'join', onLine });
    controller.enqueue(encoder.encode('{"message":"old"}\n'));
    await vi.waitFor(() => expect(onLine).toHaveBeenCalledOnce());
    await expect(route.ndjson({ concurrency: 'join-full', onLine: vi.fn() }))
      .rejects.toThrow('history unavailable');
    controller.close();
    await a;
  });

  it('queues the next NDJSON call until the active stream reaches EOF', async () => {
    const first = openStream();
    const second = openStream();
    const fetch = vi.fn().mockResolvedValueOnce(first.response).mockResolvedValueOnce(second.response);
    vi.stubGlobal('fetch', fetch);
    const route = api().Build.Run;
    const a = route.ndjson({ onLine: vi.fn() });
    const onLine = vi.fn();
    const b = route.ndjson({ onLine });
    expect(fetch).toHaveBeenCalledOnce();
    first.controller.close();
    await a;
    expect(fetch).toHaveBeenCalledTimes(2);
    second.controller.enqueue(encoder.encode('{"message":"next"}\n'));
    second.controller.close();
    await b;
    expect(onLine).toHaveBeenCalledWith({ message: 'next' });
  });

});
