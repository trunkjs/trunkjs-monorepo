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

## Middleware

Cross-cutting request behavior is implemented with generic middleware instead of built-in retry, authentication or loading semantics.

```ts
const api = API.use(async (ctx, next) => {
  const started = performance.now();
  ctx.setMetadata('started', started);

  try {
    await next();
  } finally {
    console.log(ctx.name, performance.now() - started);
  }
});
```

Middleware can inspect and change the request before `next()` and inspect or transform the result afterwards:

```ts
const api = API.use(async (ctx, next) => {
  ctx.init.headers = new Headers(ctx.init.headers);
  ctx.init.headers.set('Authorization', getToken());

  await next();

  if (ctx.response?.status === 204) {
    ctx.data = null;
  }
});
```

Each request gets its own metadata store. String or symbol keys can be used by independent middleware without adding application-specific concepts to api-stub:

```ts
const attempt = Symbol('attempt');

const api = API.use(async (ctx, next) => {
  ctx.setMetadata(attempt, 1);
  await next();
  console.log(ctx.getMetadata<number>(attempt));
});
```

Middleware composes in registration order and `defaults({ middleware: [...] })` can add middleware to a derived API proxy as well.

## Paths and requests

```ts
const path = api.User.Get.path({
  params: { userId: 123 },
  query: { details: true },
});

const user = await api.User.Get.request({
  params: { userId: 123 },
  query: { details: true },
  options: {
    headers: { 'X-Request-ID': 'request-123' },
  },
});

// user: User
```

A request with a body is typed as well:

```ts
const updated = await api.User.Update.request({
  params: { userId: 123 },
  body: { name: 'Peter' },
});

// updated: User
```

At runtime, `API.User.Get` and the other namespace levels are not generated objects. A single `Proxy` collects the property path and resolves it against the compact route table only when `path()` or `request()` is called.

## NDJSON streaming

Use `.ndjson()` instead of `.request()` to receive newline-delimited JSON
objects. The route's response type describes one record, not the entire stream.

```ts
await API.Build.Run.ndjson({
  idleWarningMs: 10_000, // Optional diagnostic, disabled by default.
  onLine: event => console.log(event), // Parsed and typed JSON object.
});
```

See the [complete example](examples/ndjson.ts) for the route declaration and
the corresponding server output. The promise resolves at EOF; async callbacks
are awaited in order. HTTP, network, decoding, parsing and callback errors
reject the promise. Pass `options: { signal: controller.signal }` to abort.
The application must check any final success/failure record itself.

The server must send `Content-Type: application/x-ndjson` and a newline after
each record (LF or CRLF). Empty lines are ignored. Response headers are checked:
compression, Content-Length or X-Accel-Buffering: yes may indicate buffering;
warnings do not abort a valid stream. Missing Transfer-Encoding: chunked is
not an error (HTTP/2 and HTTP/3 do not use it). For cross-origin responses,
expose Content-Encoding and X-Accel-Buffering via Access-Control-Expose-Headers
if needed. The optional idle warning measures time without a complete record
after response headers arrive, excluding callback processing; it cannot prove
a proxy is buffering. Middleware wraps the entire stream with mode `ndjson`;
built-in caching and deduplication are bypassed. Do not retry a partially
delivered stream automatically.

Concurrent NDJSON calls are independent by default. The [example](examples/ndjson.ts)
shows shared, route-specific middleware for rejecting duplicate calls or
aborting the previous stream on a new call, plus explicit AbortController
cancellation. Aborting a request does not guarantee the server-side job stops.
