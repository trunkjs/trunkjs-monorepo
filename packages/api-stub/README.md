# @trunkjs/api-stub

A tiny proxy-based runtime for typed API stubs. Route-specific request and response information lives in TypeScript types; runtime data is reduced to HTTP method and route.

## Manual stub description

```ts
import { ApiRoute, createApi } from '@trunkjs/api-stub';

interface User { id: number; name: string }

type Routes = {
  User: {
    Get: ApiRoute<{ tenantId?: number; userId?: number }, { details?: boolean }, never, User>;
    Update: ApiRoute<{ tenantId?: number; userId?: number }, { notify?: boolean }, { name: string }, User>;
  };
};

const routes = {
  'User.Get': ['GET', '/api/{tenantId}/user/{userId}'],
  'User.Update': ['PUT', '/api/{tenantId}/user/{userId}'],
} as const;

const API = createApi<Routes>(routes, {
  baseUrl: 'https://example.test',
  params: { tenantId: 42 },
  query: { language: 'de' },
  options: {
    credentials: 'include',
    headers: { 'X-App': 'frontend' },
  },
});
```

Route parameters are deliberately optional at compile time. Missing parameters are resolved from defaults and only cause a runtime error if neither the call nor the defaults provide them.

## Methods

| Method | Result |
| --- | --- |
| `.path()` | Relative path with parameters and query |
| `.url()` | URL with base URL, parameters and query |
| `.request()` | Parsed, typed JSON response |
| `.ndjson({ onLine })` | Typed JSON object per line; resolves at EOF |
| `.raw()` | Native Fetch Response; caller owns the body |
| `.with(config)` / `.defaults(config)` | Derived API with inherited defaults |
| `.use(middleware)` | Derived API with middleware |

```ts
const user = await API.User.Get.request({ params: { userId: 123 } });
const updated = await API.User.Update.request({
  params: { userId: 123 }, body: { name: 'Ada' },
});
```

## Concurrency

Set `concurrency` globally in `createApi`, for a route/group with
`.with({ concurrency: 'join' })`, or on each `.request()` / `.ndjson()` call.

| Mode | Identical request already running |
| --- | --- |
| `parallel` (default) | Start another request |
| `reject` | Reject the new call |
| `abort` | Abort all matching requests and start a new one |
| `join` | Share the most recent matching request and its result |

```ts
const input = { params: { userId: 123 }, concurrency: 'join' } as const;
const [a, b] = await Promise.all([
  API.User.Get.request(input),
  API.User.Get.request(input),
]); // One HTTP request, same parsed result.
```

Matching uses the resolved URL, method, serialized body, headers, response mode
and Fetch options after middleware. Derived proxies share the registry; separate
`createApi()` instances do not. A joiner's AbortSignal cancels only its own
subscription; the last cancellation aborts the transport. `abort` cancels all
matching subscriptions with AbortError. Raw responses are independent; use
their native AbortSignal. HTTP cancellation does not guarantee server-job
cancellation.

## NDJSON

```ts
await API.Build.Run.ndjson({
  concurrency: 'abort',
  idleWarningMs: 10_000,
  onLine: event => console.log(event), // Parsed, typed object.
});
```

See [NDJSON example](examples/ndjson.ts) for the route and wire data.
`join` delivers future records to each callback without replay or history.
Async callbacks are awaited in order; the initiating call sets stream diagnostics.
A failed callback rejects its own call; HTTP, network or parsing errors reject
all active subscribers. The application checks the final success/failure record.

The server must send `application/x-ndjson` and terminate each JSON object with
LF or CRLF. Empty lines are ignored. Compression, Content-Length,
X-Accel-Buffering: yes and optional idle time trigger diagnostic warnings, not
errors. Missing chunked encoding is valid in HTTP/2 and HTTP/3. Cross-origin
servers may need to expose Content-Encoding and X-Accel-Buffering via CORS.
Do not retry a partially delivered stream automatically.

## Middleware

```ts
const api = API.use(async (ctx, next) => {
  ctx.init.headers = new Headers(ctx.init.headers);
  ctx.init.headers.set('Authorization', getToken());
  await next();
});
```

Middleware runs for each caller through completion. The optional GET cache
(`createCacheMiddleware`) applies only to `.request()`; NDJSON is never cached.
Use `getMetadata()` / `setMetadata()` for request-local state.
See [middleware example](examples/middleware.ts) and
[all features](examples/all-features.ts).
