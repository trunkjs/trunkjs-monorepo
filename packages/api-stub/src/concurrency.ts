import { sharedFailure } from './feedback';
import { createRequestKey } from './request-utils';
import type { ApiMiddlewareContext, Concurrency, NdjsonOptions } from './types';

type OnLine = NdjsonOptions<unknown>['onLine'];
type Execute = (transport: ApiMiddlewareContext, onLine: OnLine) => Promise<void>;
type Outcome = { ok: true } | { ok: false; error: unknown };
interface Subscriber {
  receive: (event: unknown) => Promise<void>;
  ready: Promise<void>;
  settle: (outcome: Outcome) => void;
}
interface Flight {
  transport: ApiMiddlewareContext;
  controller: AbortController;
  subscribers: Set<Subscriber>;
  accepting: boolean;
  received: number;
  history?: unknown[];
}
interface Waiting {
  limit: number;
  start: () => void;
  cancel: (error: unknown) => void;
}

/** One registry per createApi() instance, shared by its derived proxies. */
export class RequestConcurrency {
  private readonly pending = new Map<string, Set<Flight>>();
  private readonly waiting = new Map<string, Waiting[]>();

  async run(
    context: ApiMiddlewareContext,
    policy: Concurrency,
    execute: Execute,
    onLine?: OnLine,
    concurrencyLimit?: number,
  ): Promise<void> {
    const signal = context.init.signal;
    signal?.throwIfAborted();
    if (!['parallel', 'reject', 'abort', 'join', 'join-full', 'queue', 'queue-latest'].includes(policy))
      throw new TypeError('Invalid concurrency policy: ' + policy);
    if (policy === 'parallel' && concurrencyLimit !== undefined
      && (!Number.isSafeInteger(concurrencyLimit) || concurrencyLimit < 1))
      throw new RangeError('concurrencyLimit must be a positive integer');

    // JSON requests have a serialized string body. Other body types cannot
    // safely be compared without consuming them.
    const init = context.init;
    if (init.body != null && typeof init.body !== 'string') {
      if (policy !== 'parallel' || concurrencyLimit !== undefined)
        throw new TypeError('Concurrency requires a JSON or string request body');
      return execute(context, onLine ?? (() => undefined));
    }

    const key = JSON.stringify([
      createRequestKey(context), context.mode, init.method, init.body,
      init.cache, init.mode, init.redirect, init.referrer, init.referrerPolicy,
      init.integrity, init.keepalive,
    ]);
    const existing = [...(this.pending.get(key) ?? [])];
    const waiting = this.waiting.get(key) ?? [];
    if (policy === 'reject' && (existing.length || waiting.length))
      throw new Error('Request already in progress: ' + context.name);
    if (policy === 'abort') {
      const error = new DOMException('Superseded by a new request', 'AbortError');
      for (const job of [...waiting]) job.cancel(error);
      for (const flight of existing) {
        this.remove(key, flight);
        flight.accepting = false;
        flight.controller.abort(error);
        for (const subscriber of flight.subscribers) subscriber.settle({ ok: false, error });
      }
    }
    signal?.throwIfAborted();

    const joining = policy === 'join' || policy === 'join-full';
    const flight = joining ? existing.filter(item => item.accepting).pop() : undefined;
    const full = policy === 'join-full' && context.mode === 'ndjson';
    if (flight) {
      if (full && !flight.history) {
        if (flight.received) throw new Error('NDJSON history unavailable: start the stream with join-full');
        flight.history = [];
      }
      return this.subscribe(key, flight, context, onLine, full);
    }

    if (policy === 'queue-latest') {
      for (const job of [...waiting])
        job.cancel(new DOMException('Superseded while queued', 'AbortError'));
    }

    const limit = policy === 'queue' || policy === 'queue-latest'
      ? 1 : policy === 'parallel' ? concurrencyLimit ?? Infinity : Infinity;
    const start = () => this.start(key, context, execute, onLine, full);
    if (Number.isFinite(limit)
      && ((this.pending.get(key)?.size ?? 0) >= limit || this.waiting.has(key))) {
      console.warn('[TrunkJS API] Request queued: ' + context.name);
      return this.enqueue(key, limit, start, signal);
    }
    return start();
  }

  private enqueue(
    key: string, limit: number, start: () => Promise<void>, signal?: AbortSignal | null,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const detach = () => signal?.removeEventListener('abort', abort);
      const job: Waiting = {
        limit,
        start: () => {
          detach();
          if (signal?.aborted) reject(signal.reason);
          else start().then(resolve, reject);
        },
        cancel: error => {
          detach();
          const queue = this.waiting.get(key);
          if (queue) {
            const index = queue.indexOf(job);
            if (index !== -1) queue.splice(index, 1);
            if (!queue.length) this.waiting.delete(key);
          }
          reject(error);
        },
      };
      const abort = () => {
        job.cancel(signal?.reason);
        this.drain(key);
      };
      const queue = this.waiting.get(key) ?? [];
      queue.push(job);
      this.waiting.set(key, queue);
      signal?.addEventListener('abort', abort, { once: true });
    });
  }

  private drain(key: string): void {
    let queue = this.waiting.get(key);
    while (queue?.length && (this.pending.get(key)?.size ?? 0) < queue[0].limit) {
      const job = queue.shift()!;
      if (!queue.length) this.waiting.delete(key);
      job.start();
      queue = this.waiting.get(key);
    }
  }

  private start(
    key: string, context: ApiMiddlewareContext, execute: Execute, onLine?: OnLine, full = false,
  ): Promise<void> {
    const controller = new AbortController();
    const flight: Flight = {
      controller,
      transport: { ...context, init: { ...context.init, signal: controller.signal } },
      subscribers: new Set(),
      accepting: true,
      received: 0,
      history: full ? [] : undefined,
    };
    const active = this.pending.get(key) ?? new Set<Flight>();
    active.add(flight);
    this.pending.set(key, active);
    const result = this.subscribe(key, flight, context, onLine, full);

    void (async () => {
      let outcome: Outcome;
      try {
        await execute(flight.transport, async event => {
          flight.received++;
          // Keep pristine copies only for streams with full replay enabled.
          flight.history?.push(structuredClone(event));
          await Promise.all([...flight.subscribers].map(async subscriber => {
            await subscriber.ready;
            await subscriber.receive(event);
          }));
        });
        // A late joiner's replay must finish even when EOF arrives before
        // another live record. Stop accepting joiners while settling.
        flight.accepting = false;
        await Promise.all([...flight.subscribers].map(subscriber => subscriber.ready));
        controller.signal.throwIfAborted();
        outcome = { ok: true };
      } catch (error) {
        outcome = { ok: false, error };
      }
      flight.accepting = false;
      this.remove(key, flight);
      flight.history = undefined;
      for (const subscriber of flight.subscribers) subscriber.settle(outcome);
      this.drain(key);
    })();
    return result;
  }

  private subscribe(
    key: string, flight: Flight, context: ApiMiddlewareContext, onLine?: OnLine, replay = false,
  ): Promise<void> {
    const signal = context.init.signal;
    return new Promise<void>((resolve, reject) => {
      const local = new AbortController();
      const subscriber: Subscriber = {
        ready: Promise.resolve(),
        settle: outcome => {
          if (!flight.subscribers.delete(subscriber)) return;
          signal?.removeEventListener('abort', abort);
          local.abort();
          context.response = flight.transport.response;
          context.data = flight.transport.data;
          if (outcome.ok) resolve();
          else {
            // All subscribers of a failed transport share this outcome, not just its error value.
            context.setMetadata(sharedFailure, outcome);
            reject(outcome.error);
          }

          // The last cancellation aborts the transport. Its slot is released
          // after the reader/fetch has finished cleanup, not while it is active.
          if (!flight.subscribers.size && this.pending.get(key)?.has(flight)) {
            flight.accepting = false;
            flight.controller.abort(outcome.ok ? undefined : outcome.error);
          }
        },
        receive: async event => {
          if (!onLine || local.signal.aborted) return;
          let detach!: () => void;
          const cancelled = new Promise<void>(resolve => {
            const stop = () => resolve();
            local.signal.addEventListener('abort', stop, { once: true });
            detach = () => local.signal.removeEventListener('abort', stop);
          });
          try {
            await Promise.race([Promise.resolve().then(() => {
              if (!local.signal.aborted) return onLine(event);
            }), cancelled]);
          } catch (error) {
            // A failing joined callback must not stop other callers.
            if (flight.subscribers.size === 1 && flight.subscribers.has(subscriber)) throw error;
            subscriber.settle({ ok: false, error });
          } finally {
            detach();
          }
        },
      };
      const abort = () => subscriber.settle({ ok: false, error: signal?.reason });
      // Snapshot before registration: each record is either in replay or live,
      // never both, even if more records arrive during an async callback.
      const history = replay ? flight.history?.slice() ?? [] : [];
      flight.subscribers.add(subscriber);
      signal?.addEventListener('abort', abort, { once: true });
      if (history.length) {
        subscriber.ready = (async () => {
          try {
            for (const event of history) {
              if (local.signal.aborted) break;
              await subscriber.receive(structuredClone(event));
            }
          } catch (error) {
            subscriber.settle({ ok: false, error });
          }
        })();
      }
    });
  }

  private remove(key: string, flight: Flight): void {
    const active = this.pending.get(key);
    if (!active) return;
    active.delete(flight);
    if (!active.size) this.pending.delete(key);
  }
}
