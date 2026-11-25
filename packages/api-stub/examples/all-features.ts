import {
  createApi,
  createCacheMiddleware,
  type ApiMiddleware,
} from '../src';
import { generatedRoutes, type GeneratedApi } from './generated-api';

const cache = createCacheMiddleware({ ttl: 30_000 });

const loading: ApiMiddleware = async (context, next) => {
  console.log('start', context.name);
  try {
    await next();
  } finally {
    console.log('stop', context.name);
  }
};

const authentication: ApiMiddleware = async (context, next) => {
  const headers = new Headers(context.init.headers);
  headers.set('Authorization', `Bearer ${getAccessToken()}`);
  context.init.headers = headers;
  await next();
};

const timingKey = Symbol('request-start');
const timing: ApiMiddleware = async (context, next) => {
  context.setMetadata(timingKey, performance.now());
  await next();
  const started = context.getMetadata<number>(timingKey)!;
  console.log(context.name, `${performance.now() - started}ms`);
};

const API = createApi<GeneratedApi>(generatedRoutes, {
  baseUrl: 'https://example.test',
  options: { credentials: 'include' },
})
  .use(cache.middleware)
  .use(authentication)
  .use(loading)
  .use(timing);

// Defaults can be scoped to one group. Every descendant inherits them.
const TenantUsers = API.User.with({
  params: { tenantId: 'acme' },
  query: { include: ['roles'] },
  options: { headers: { 'X-Tenant': 'acme' } },
});

const path = TenantUsers.Get.path({ params: { userId: '42' } });
const url = TenantUsers.Get.url({ params: { userId: '42' } });
console.log(path, url);

// Fully typed parsed response.
const user = await TenantUsers.Get.request({ params: { userId: '42' } });
console.log(user.name);

// Same GETs running at the same time share the in-flight request.
cache.clear();
await Promise.all([
  TenantUsers.Get.request({ params: { userId: '42' }, concurrency: 'join' }),
  TenantUsers.Get.request({ params: { userId: '42' }, concurrency: 'join' }),
]);

// Independent alternatives: queue (default), limited parallelism or latest waiting call.
cache.clear();
const queued = TenantUsers.Get.with({ concurrency: 'queue' });
await Promise.all([
  queued.request({ params: { userId: '42' } }),
  queued.request({ params: { userId: '42' } }),
]); // Two sequential requests; warning for the queued call.
const limited = TenantUsers.Get.with({ concurrency: 'parallel', concurrencyLimit: 3 });
const latest = TenantUsers.Get.with({ concurrency: 'queue-latest' });
cache.clear();
await Promise.all(Array.from({ length: 4 }, () =>
  limited.request({ params: { userId: '42' } }),
)); // Fourth request waits.
cache.clear();
const calls = [1, 2, 3].map(() => latest.request({ params: { userId: '42' } }));
console.log((await Promise.allSettled(calls)).map(result => result.status));
// fulfilled, rejected (AbortError), fulfilled

// A route can allow multiple methods.
await TenantUsers.Item.request({
  method: 'PATCH',
  params: { userId: '42' },
  body: { name: 'Ada' },
});

// Escape hatch: native Response, no parsed-response cache/deduplication.
const response = await TenantUsers.Get.raw({ params: { userId: '42' } });
console.log(response.status, response.headers.get('etag'));

// Cache can be controlled independently of the API client.
cache.setTtl(60_000);
cache.clear();

function getAccessToken(): string {
  return 'example-token';
}
