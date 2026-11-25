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

// Alternative: join a running stream, receiving only future records.
const first = API.Build.Run.ndjson({ concurrency: 'join', onLine: console.log });
const second = API.Build.Run.ndjson({ concurrency: 'join', onLine: console.log });
await Promise.all([first, second]); // One HTTP request.

// Alternative: reject the second call while the first runs.
const running = API.Build.Run.ndjson({ concurrency: 'reject', onLine: console.log });
const duplicate = API.Build.Run.ndjson({ concurrency: 'reject', onLine: console.log });
console.log((await Promise.allSettled([running, duplicate]))[1].status); // rejected

// Alternative: replace an active stream, then cancel the replacement explicitly.
const previous = API.Build.Run.ndjson({ concurrency: 'abort', onLine: console.log });
const cancel = new AbortController();
const replacement = API.Build.Run.ndjson({
  concurrency: 'abort',
  options: { signal: cancel.signal },
  onLine: console.log,
});
cancel.abort(); // E.g. a Cancel button. Does not guarantee the server job stops.
await Promise.allSettled([previous, replacement]); // Both rejected.
