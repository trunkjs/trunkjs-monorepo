# @trunkjs/api-stub

A tiny proxy-based runtime for typed API stubs. Route-specific request and response information lives in TypeScript types; runtime data is reduced to HTTP method and route.

## Manual stub description

```ts
import { ApiRoute, createApi } from '@trunkjs/api-stub';

interface User {
  id: number;
  name: string;
}

type Routes = {
  User: {
    Get: ApiRoute<
      { tenantId?: number; userId?: number },
      { details?: boolean },
      never,
      User
    >;
    Update: ApiRoute<
      { tenantId?: number; userId?: number },
      { notify?: boolean },
      { name: string },
      User
    >;
  };
};

const API = createApi<Routes>({
  'User.Get': ['GET', '/api/{tenantId}/user/{userId}'],
  'User.Update': ['PUT', '/api/{tenantId}/user/{userId}'],
});
```

Route parameters are deliberately optional at compile time. Missing parameters are resolved from defaults and only cause a runtime error if neither the call nor the defaults provide them.

## Defaults

```ts
const api = API.defaults({
  params: { tenantId: 42 },
  query: { language: 'de' },
  options: {
    credentials: 'include',
    headers: { 'X-App': 'frontend' },
  },
});
```

Defaults are immutable: `defaults()` returns another proxy. Parameters, query values and headers supplied on an individual call override defaults with the same name.

## Build a path

```ts
const path = api.User.Get.path({
  params: { userId: 123 },
  query: { details: true },
});

// /api/42/user/123?language=de&details=true
```

## Execute a request

```ts
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
