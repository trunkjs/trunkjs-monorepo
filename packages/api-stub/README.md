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
