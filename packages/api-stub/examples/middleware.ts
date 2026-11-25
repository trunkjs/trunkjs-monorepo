import {
  createApi,
  createCacheMiddleware,
  type ApiMiddleware,
} from '../src';
import { generatedRoutes, type GeneratedApi } from './generated-api';

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
  } finally {
    console.log('duration', performance.now() - context.getMetadata<number>(startedAt)!);
  }
};

void cachedApi;
void authenticatedApi;
// Request failure presentation belongs to the global onError callback, not middleware.
const appApi = authenticatedApi.with({
  feedback: 'mini',
  onFeedbackStart: event => console.log('start', event.id),
  onFeedbackEnd: event => console.log('end', event.id, event.status),
  onError: event => console.error(event.context.name, event.error),
}).use(logger);
void appApi;
