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

## API configuration

A base URL, defaults and request lifecycle hooks can be configured once for an API:

```ts
const API = createApi<Routes>(routes, {
  baseUrl: 'https://example.test',
  params: { tenantId: 42 },
  query: { language: 'de' },
  options: {
    credentials: 'include',
    headers: { 'X-App': 'frontend' },
  },
  onRequest: ({ name }) => loading.start(name),
  onResponse: (_response, { name }) => loading.stop(name),
  onError: (error, { name }) => {
    loading.stop(name);
    console.error(name, error);
  },
});
```

`path()` uses the base URL as well:

```ts
API.User.Get.path({ params: { userId: 123 } });
// https://example.test/api/42/user/123?language=de
```

`defaults()` returns another immutable proxy and can add or override the same API-wide configuration:

```ts
const api = API.defaults({
  params: { tenantId: 84 },
  options: {
    headers: { 'X-Mode': 'admin' },
  },
});
```

Parameters, query values and headers supplied on an individual call override defaults with the same name.

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

Hooks can be overridden or disabled for one request:

```ts
await api.User.Get.request({
  params: { userId: 123 },
  options: {
    onRequest: () => specialLoader.start(),
    onResponse: () => specialLoader.stop(),
    onError: false,
  },
});

await api.User.Get.request({
  params: { userId: 123 },
  options: {
    onRequest: false,
    onResponse: false,
  },
});
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
