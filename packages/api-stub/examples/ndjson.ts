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
