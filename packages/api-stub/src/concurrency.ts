import { createRequestKey } from './request-utils';
import type { ApiMiddlewareContext, Concurrency, NdjsonOptions } from './types';

type OnLine = NdjsonOptions<unknown>['onLine'];
type Outcome = { ok: true } | { ok: false; error: unknown };
interface Subscriber {
  receive: (event: unknown) => Promise<void>;
  settle: (outcome: Outcome) => void;
}
interface Flight {
  transport: ApiMiddlewareContext;
  controller: AbortController;
  subscribers: Set<Subscriber>;
}

/** One registry per createApi() instance, shared by its derived proxies. */
export class RequestConcurrency {
  private readonly pending = new Map<string, Set<Flight>>();

  async run(
    context: ApiMiddlewareContext,
    policy: Concurrency,
    execute: (transport: ApiMiddlewareContext, onLine: OnLine) => Promise<void>,
    onLine?: OnLine,
  ): Promise<void> {
    const signal = context.init.signal;
    signal?.throwIfAborted();
    if (!['parallel', 'reject', 'abort', 'join'].includes(policy))
      throw new TypeError('Invalid concurrency policy: ' + policy);

    // JSON requests have a serialized string body. Other body types cannot
    // safely be compared without consuming them.
    const init = context.init;
    if (init.body != null && typeof init.body !== 'string') {
      if (policy !== 'parallel') throw new TypeError('Concurrency requires a JSON or string request body');
      return execute(context, onLine ?? (() => undefined));
    }

    const key = JSON.stringify([
      createRequestKey(context), context.mode, init.method, init.body,
      init.cache, init.mode, init.redirect, init.referrer, init.referrerPolicy,
      init.integrity, init.keepalive,
    ]);
    const existing = [...(this.pending.get(key) ?? [])];
    if (policy === 'reject' && existing.length)
      throw new Error('Request already in progress: ' + context.name);
    if (policy === 'abort') {
      for (const flight of existing) {
        const error = new DOMException('Superseded by a new request', 'AbortError');
        this.remove(key, flight);
        flight.controller.abort(error);
        for (const subscriber of flight.subscribers) subscriber.settle({ ok: false, error });
      }
    }
    signal?.throwIfAborted();

    let flight = policy === 'join' ? existing[existing.length - 1] : undefined;
    const isNew = !flight;
    if (!flight) {
      const controller = new AbortController();
      flight = {
        controller,
        transport: { ...context, init: { ...init, signal: controller.signal } },
        subscribers: new Set(),
      };
      const active = this.pending.get(key) ?? new Set<Flight>();
      active.add(flight);
      this.pending.set(key, active);
    }
    const current = flight;

    const result = new Promise<void>((resolve, reject) => {
      const local = new AbortController();
      const subscriber: Subscriber = {
        settle: outcome => {
          if (!current.subscribers.delete(subscriber)) return;
          signal?.removeEventListener('abort', abort);
          local.abort();
          context.response = current.transport.response;
          context.data = current.transport.data;
          if (outcome.ok) resolve();
          else reject(outcome.error);

          // A caller cancels only its own subscription; stop the HTTP request
          // when nobody remains. Supersession stops all subscriptions.
          if (!current.subscribers.size && this.pending.get(key)?.has(current)) {
            this.remove(key, current);
            current.controller.abort(outcome.ok ? undefined : outcome.error);
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
            // For the final subscriber let the reader release its lock before
            // rejecting; a failing joined callback must not stop other callers.
            if (current.subscribers.size === 1 && current.subscribers.has(subscriber)) throw error;
            subscriber.settle({ ok: false, error });
          } finally {
            detach();
          }
        },
      };
      const abort = () => subscriber.settle({ ok: false, error: signal?.reason });
      current.subscribers.add(subscriber);
      signal?.addEventListener('abort', abort, { once: true });
    });

    if (isNew) {
      void (async () => {
        let outcome: Outcome;
        try {
          await execute(current.transport, async event => {
            // Snapshot at delivery: late joiners never receive historical lines.
            await Promise.all([...current.subscribers].map(subscriber => subscriber.receive(event)));
          });
          current.controller.signal.throwIfAborted();
          outcome = { ok: true };
        } catch (error) {
          outcome = { ok: false, error };
        }
        this.remove(key, current);
        for (const subscriber of current.subscribers) subscriber.settle(outcome);
      })();
    }
    return result;
  }

  private remove(key: string, flight: Flight): void {
    const active = this.pending.get(key);
    if (!active) return;
    active.delete(flight);
    if (!active.size) this.pending.delete(key);
  }
}
