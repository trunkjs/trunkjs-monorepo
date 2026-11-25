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

## Request feedback and global errors

Configure the feedback adapter once at application startup. UI components should
only choose the feedback key/details; do not wrap each request in custom loading
or error handlers. The API stub has no UI dependency.

```ts
const appApi = API.with({
  feedback: 'mini',
  onFeedbackStart: event => console.log('start', event.id, event.name ?? event.context.name),
  onFeedbackEnd: event => console.log('end', event.id, event.status),
  onError: event => console.error(event.feedback && event.feedback.errorMessage ||
    'Error: ' + (event.name ?? event.context.name), event.error),
});

await appApi.User.Update.request({
  params: { userId: 123 },
  body: { name: 'Ada' },
  feedback: {
    key: 'dialog',
    name: 'Save user',
    successMessage: 'User saved.',
    errorMessage: 'Unable to save user.',
  },
});
```

Replace the console callbacks with the application's single UI feedback adapter.
Keys are arbitrary; `FeedbackDetails` also accepts `loadingMessage` and `data`
for adapter-specific metadata. The adapter chooses presentation and fallback
texts, e.g. the name as loading text and "Error: " + name as the error title.
A false success/error message suppresses that presentation in the adapter,
not the global callback itself.

Feedback defaults merge field by field through `createApi`, `.with()` and the
request. A string sets the key, an object overrides specified fields, and
`false` disables start/end callbacks and clears inherited details.
`reportError: false` separately disables the global error callback.
No feedback option is sent to the server.

Every executed request with feedback enabled emits start/end with the same
unique invocation ID, including queued, joined and cached calls. End status is
`success`, `error` or `aborted`; the event exposes the original error and
HTTP response when available. Callbacks are invoked without awaiting their
promises; failures are logged and never replace the request result. Keep
active IDs in the adapter and defer display if needed to avoid cache flicker.
The global error callback runs after end, also for silent requests, but not
for cancellation. A shared transport failure is reported once per error
callback; every joined caller still receives its own end and rejection.

`.request()` and `.ndjson()` report HTTP, network, parsing and middleware
failures without swallowing them. `.raw()` retains native Fetch semantics
(non-2xx responses are returned, not thrown); its lifecycle ends when the
Response is available, not when the caller finishes reading the body.
Validation before request context creation and errors in subsequent application
code remain outside this lifecycle. See [all features](examples/all-features.ts).

## Concurrency

Set `concurrency` globally in `createApi`, for a route/group with
`.with({ concurrency: 'join' })`, or on each `.request()` / `.ndjson()` call.

| Mode | Identical request already running |
| --- | --- |
| `queue` (default) | Wait in FIFO order; warn when queued |
| `queue-latest` | Keep the running request and only the latest waiting call |
| `parallel` | Start another request; optional `concurrencyLimit` |
| `reject` | Reject the new call |
| `abort` | Abort all matching requests and start a new one |
| `join` | Share the most recent matching request; future NDJSON records only |
| `join-full` | Like `join`, but replay all previous NDJSON records first |

```ts
const input = { params: { userId: 123 }, concurrency: 'join' } as const;
const [a, b] = await Promise.all([
  API.User.Get.request(input),
  API.User.Get.request(input),
]); // One HTTP request, same parsed result.
```

Use `concurrencyLimit: 3` with `parallel` to run at most three matching
requests; overflow waits in FIFO order. The limit can also be set in defaults.
All queued calls produce a warning. `queue-latest` rejects displaced waiting
calls with AbortError; `abort` cancels matching running and waiting calls.

Matching uses the resolved URL, method, serialized body, headers, response mode
and Fetch options after middleware. Derived proxies share the registry; separate
`createApi()` instances do not. A joiner's AbortSignal cancels only its own
subscription; the last cancellation aborts the transport. Raw responses are independent; use
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
`join` delivers future records without replay. Start with `join-full` to enable
history; late full joins replay records individually before live delivery.
Joining with `join-full` after unrecorded lines rejects instead of returning
incomplete history. History is released when the stream ends and grows with
stream size. Async callbacks are awaited; the initiating call sets diagnostics.
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
(`createCacheMiddleware`) applies only to `.request()`; NDJSON has no persistent cache.
Use `getMetadata()` / `setMetadata()` for request-local state.
See [middleware example](examples/middleware.ts) and
[all features](examples/all-features.ts).
