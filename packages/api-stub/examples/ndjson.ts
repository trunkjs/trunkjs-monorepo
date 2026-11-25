import { createApi, type ApiRoute } from '../src';

type BuildEvent =
  | { type: 'log'; message: string }
  | { type: 'progress'; progress: number }
  | { type: 'result'; success: boolean };

type Routes = {
  Build: { Run: ApiRoute<{}, {}, never, BuildEvent, 'GET'> };
};

const API = createApi<Routes>({ 'Build.Run': ['GET', '/api/stream'] });

// The server sends one JSON object per line:
// {"type":"log","message":"Build started"}
// {"type":"progress","progress":50}
// {"type":"result","success":true}

await API.Build.Run.ndjson({
  idleWarningMs: 10_000,
  onLine: event => {
    // Parsed, typed object, not a string.
    if (event.type === 'log') console.log(event.message);
    if (event.type === 'progress') console.log(event.progress);
    if (event.type === 'result') console.log(event.success);
  },
});

// Output as records arrive: Build started, 50, true.
console.log('Stream ended');


// Alternative 1: reject duplicate calls to this route while a stream is active.
// Keep this middleware on the shared API instance, not in individual UI elements.
let running = false;
const blockingAPI = API.use(async (ctx, next) => {
  if (ctx.mode !== 'ndjson' || ctx.name !== 'Build.Run') return next();
  if (running) throw new Error('Build.Run is already streaming');
  running = true;
  try {
    await next();
  } finally {
    running = false;
  }
});
const blocked = await Promise.allSettled([
  blockingAPI.Build.Run.ndjson({ onLine: event => console.log(event) }),
  blockingAPI.Build.Run.ndjson({ onLine: event => console.log(event) }),
]);
console.log(blocked[1].status); // rejected: no second HTTP request

// Alternative 2: a new invocation cancels the previous stream for this route.
let active: AbortController | undefined;
const latestAPI = API.use(async (ctx, next) => {
  if (ctx.mode !== 'ndjson' || ctx.name !== 'Build.Run') return next();
  active?.abort();
  const controller = new AbortController();
  active = controller;
  ctx.init.signal = ctx.init.signal
    ? AbortSignal.any([ctx.init.signal, controller.signal])
    : controller.signal;
  try {
    await next();
  } finally {
    if (active === controller) active = undefined;
  }
});
const previous = latestAPI.Build.Run.ndjson({ onLine: event => console.log(event) });
const replacement = latestAPI.Build.Run.ndjson({ onLine: event => console.log(event) });
const outcomes = await Promise.allSettled([previous, replacement]);
console.log(outcomes[0].status); // rejected with AbortError

// Explicit cancellation, e.g. from a Cancel button.
const cancel = new AbortController();
const stream = API.Build.Run.ndjson({
  options: { signal: cancel.signal },
  onLine: event => console.log(event),
});
cancel.abort();
console.log((await Promise.allSettled([stream]))[0].status); // rejected
// Aborting the HTTP request does not guarantee that the backend job stops.
