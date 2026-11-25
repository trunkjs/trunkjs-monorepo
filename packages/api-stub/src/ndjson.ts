import type { NdjsonOptions } from './types';

const prefix = '[TrunkJS NDJSON]';

function warnAboutBuffering(headers: Headers): void {
  const encoding = headers.get('Content-Encoding');
  if (encoding && encoding.toLowerCase().split(',').some(value => value.trim() !== 'identity')) {
    console.warn(prefix + ' Content-Encoding: ' + encoding + ' detected. Compression may delay streaming. Disable compression for this endpoint.');
  }
  if (headers.has('Content-Length')) {
    console.warn(prefix + ' Content-Length detected. Check server and reverse proxy response buffering.');
  }
  if (headers.get('X-Accel-Buffering')?.trim().toLowerCase() === 'yes') {
    console.warn(prefix + ' X-Accel-Buffering: yes detected. Disable proxy response buffering for this endpoint.');
  }
  // Transfer-Encoding: chunked is not required for HTTP/2 or HTTP/3.
}

/** Consume the Fetch body without accumulating completed records. */
export async function readNdjson(
  response: Response,
  options: NdjsonOptions<unknown>,
  signal?: AbortSignal | null,
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error(prefix + ' Response has no readable body.');
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let buffer = '';
  let lineNumber = 0;
  let complete = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const clearIdle = () => {
    if (idleTimer !== undefined) clearTimeout(idleTimer);
    idleTimer = undefined;
  };
  const startIdle = () => {
    clearIdle();
    if (options.idleWarningMs) {
      idleTimer = setTimeout(() => {
        console.warn(prefix + ' No complete record received for ' + options.idleWarningMs
          + ' ms. Check server/proxy buffering or a long-running server operation.');
      }, options.idleWarningMs);
    }
  };

  try {
    const contentType = response.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/x-ndjson') {
      throw new Error(prefix + ' Expected application/x-ndjson, received ' + (contentType || 'no Content-Type')
        + '. Check the server endpoint and response headers.');
    }
    warnAboutBuffering(response.headers);
    startIdle();

    while (true) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });

      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        lineNumber++;
        if (!line.trim()) continue;

        let event: unknown;
        try {
          event = JSON.parse(line);
        } catch {
          throw new Error(prefix + ' Invalid JSON at line ' + lineNumber);
        }
        if (event === null || typeof event !== 'object' || Array.isArray(event)) {
          throw new Error(prefix + ' Expected a JSON object at line ' + lineNumber);
        }

        // Callback processing is not server idle time.
        clearIdle();
        signal?.throwIfAborted();
        await options.onLine(event);
        signal?.throwIfAborted();
        if (!done) startIdle();
      }

      if (done) {
        if (buffer.length !== 0) {
          throw new Error(prefix + ' Incomplete final line: expected a newline terminator.');
        }
        complete = true;
        return;
      }
    }
  } finally {
    clearIdle();
    if (!complete) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
