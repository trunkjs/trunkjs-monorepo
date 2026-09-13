import type { ApiMiddleware, ApiMiddlewareContext, ApiMiddlewareNext } from './types';
import { createRequestKey } from './request-utils';

export async function runMiddleware(
  middleware: readonly ApiMiddleware[],
  context: ApiMiddlewareContext,
  terminal: ApiMiddlewareNext,
): Promise<void> {
  let index = -1;
  const dispatch = async (position: number): Promise<void> => {
    if (position <= index) throw new Error('Middleware next() called multiple times');
    index = position;
    const current = middleware[position];
    if (!current) return terminal();
    await current(context, () => dispatch(position + 1));
  };
  await dispatch(0);
}

export interface DeduplicateMiddlewareController {
  middleware: ApiMiddleware;
  clear(): void;
}

export function createDeduplicateMiddleware(): DeduplicateMiddlewareController {
  const pending = new Map<string, Promise<{ data: unknown; response?: Response }>>();

  return {
    clear() {
      pending.clear();
    },
    middleware: async (context, next) => {
      if (context.mode !== 'request' || context.method !== 'GET') return next();
      const key = createRequestKey(context);
      const existing = pending.get(key);
      if (existing) {
        const result = await existing;
        context.data = result.data;
        context.response = result.response;
        return;
      }

      const request = (async () => {
        await next();
        return { data: context.data, response: context.response };
      })();
      pending.set(key, request);
      try {
        await request;
      } finally {
        if (pending.get(key) === request) pending.delete(key);
      }
    },
  };
}

export interface CacheMiddlewareOptions {
  ttl?: number;
}

export interface CacheMiddlewareController {
  middleware: ApiMiddleware;
  clear(): void;
  setTtl(ttl: number): void;
  getTtl(): number;
}

export function createCacheMiddleware(options: CacheMiddlewareOptions = {}): CacheMiddlewareController {
  let ttl = Math.max(0, options.ttl ?? 30_000);
  const entries = new Map<string, { expiresAt: number; data: unknown; response?: Response }>();

  return {
    clear() {
      entries.clear();
    },
    setTtl(value: number) {
      ttl = Math.max(0, value);
    },
    getTtl() {
      return ttl;
    },
    middleware: async (context, next) => {
      if (context.mode !== 'request' || context.method !== 'GET' || ttl === 0) return next();
      const key = createRequestKey(context);
      const cached = entries.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        context.data = cached.data;
        context.response = cached.response;
        return;
      }
      if (cached) entries.delete(key);

      await next();
      if (context.error === undefined) {
        entries.set(key, { expiresAt: Date.now() + ttl, data: context.data, response: context.response });
      }
    },
  };
}
