import {
  createApi,
  createCacheMiddleware,
  createDeduplicateMiddleware,
  type ApiMiddleware,
} from '../src';
import { generatedRoutes, type GeneratedApi } from './generated-api';

// Concurrent GET deduplication. The entry disappears as soon as the request settles.
const dedup = createDeduplicateMiddleware();
const deduplicatedApi = createApi<GeneratedApi>(generatedRoutes).use(dedup.middleware);

// Persistent GET cache with mutable TTL and explicit invalidation.
const cache = createCacheMiddleware({ ttl: 10_000 });
const cachedApi = createApi<GeneratedApi>(generatedRoutes).use(cache.middleware);
cache.setTtl(60_000);
cache.clear();

// Authentication is ordinary middleware; api-stub has no auth-specific core code.
const auth: ApiMiddleware = async (context, next) => {
  const headers = new Headers(context.init.headers);
  headers.set('Authorization', 'Bearer token');
  context.init.headers = headers;
  await next();
};
const authenticatedApi = createApi<GeneratedApi>(generatedRoutes).use(auth);

// Metadata lets independent middleware attach request-local state.
const startedAt = Symbol('started-at');
const logger: ApiMiddleware = async (context, next) => {
  context.setMetadata(startedAt, performance.now());
  try {
    await next();
  } catch (error) {
    console.error('request failed', context.name, error);
    throw error;
  } finally {
    console.log('duration', performance.now() - context.getMetadata<number>(startedAt)!);
  }
};

void deduplicatedApi;
void cachedApi;
void authenticatedApi;
void logger;
