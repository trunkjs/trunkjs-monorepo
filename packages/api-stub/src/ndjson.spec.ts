import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApi } from './api';
import { createCacheMiddleware, createDeduplicateMiddleware } from './middleware';
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
    expect(response.body?.locked).toBe(false);
    expect(onLine).toHaveBeenCalledOnce();
  });

  it('runs repeated calls independently despite built-in cache and deduplication', async () => {
    const fetch = vi.fn(async () => new Response('{"message":"ok"}\n', {
      headers: { 'Content-Type': 'application/x-ndjson' },
    }));
    vi.stubGlobal('fetch', fetch);
    const shared = api().use(createCacheMiddleware().middleware).use(createDeduplicateMiddleware().middleware);
    const first = vi.fn();
    const second = vi.fn();
    await Promise.all([
      shared.Build.Run.ndjson({ onLine: first }),
      shared.Build.Run.ndjson({ onLine: second }),
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
});
