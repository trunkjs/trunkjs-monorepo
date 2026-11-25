import { withFeedback } from './feedback';
import { runMiddleware } from './middleware';
import { RequestConcurrency } from './concurrency';
import { readNdjson } from './ndjson';
import { buildPath, buildUrl, mergeConfig, mergeHeaders, mergeRequestOptions, resolveMethod } from './request-utils';
import type {
  Api,
  ApiConfig,
  ApiMiddleware,
  ApiMiddlewareContext,
  ApiNamespace,
  NdjsonOptions,
  RequestInput,
  RouteDefinition,
  RouteTable,
} from './types';

export function createApi<T>(routes: RouteTable, config: ApiConfig = {}): Api<T> {
  return createProxy<T>(routes, mergeConfig(defaultApiConfig(), config), [], new RequestConcurrency());
}

function defaultApiConfig(): ApiConfig {
  if (typeof document === 'undefined') return {};
  const appUrlPrefix = document.querySelector<HTMLMetaElement>('meta[name="app-url-prefix"]')?.content;
  return appUrlPrefix && appUrlPrefix !== '/' ? { baseUrl: appUrlPrefix } : {};
}

function createProxy<T>(routes: RouteTable, config: ApiConfig, path: string[], concurrency: RequestConcurrency): ApiNamespace<T> {
  return new Proxy(() => undefined, {
    get(_target, property) {
      if (property === 'with' || property === 'defaults') {
        return (additional: ApiConfig) => createProxy<T>(routes, mergeConfig(config, additional), path, concurrency);
      }
      if (property === 'use') {
        return (middleware: ApiMiddleware) =>
          createProxy<T>(
            routes,
            {
              ...config,
              middleware: [...(config.middleware ?? []), middleware],
            },
            path,
            concurrency,
          );
      }
      if (property === 'path') {
        return (input: { params?: Record<string, unknown>; query?: Record<string, unknown> } = {}) =>
          buildPath(resolveRoute(routes, path), config, input);
      }
      if (property === 'url') {
        return (input: { params?: Record<string, unknown>; query?: Record<string, unknown> } = {}) =>
          buildUrl(resolveRoute(routes, path), config, input);
      }
      if (property === 'raw') {
        return (input: RequestInput = {}) => executeRaw(path.join('.'), resolveRoute(routes, path), config, input);
      }
      if (property === 'ndjson') {
        return (input: RequestInput & NdjsonOptions<unknown>) =>
          executeNdjson(path.join('.'), resolveRoute(routes, path), config, input, concurrency);
      }
      if (property === 'request') {
        return (input: RequestInput = {}) => executeRequest(path.join('.'), resolveRoute(routes, path), config, input, concurrency);
      }
      if (typeof property === 'string') return createProxy<T>(routes, config, [...path, property], concurrency);
      return undefined;
    },
  }) as unknown as ApiNamespace<T>;
}

function resolveRoute(routes: RouteTable, path: string[]): RouteDefinition {
  const name = path.join('.');
  const route = routes[name];
  if (!route) throw new Error(`Unknown API route: ${name}`);
  return route;
}

async function executeRaw(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: RequestInput,
): Promise<Response> {
  const context = createContext(name, definition, config, input, 'raw');
  return withFeedback(config, input, context, async () => {
    await runMiddleware(config.middleware ?? [], context, async () => {
      try {
        context.response = await fetch(context.url, context.init);
      } catch (error) {
        context.error = error;
        throw error;
      }
    });
    if (context.error !== undefined) throw context.error;
    if (!context.response) throw new Error(`API request produced no response: ${name}`);
    return context.response;
  });
}

async function executeRequest(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: RequestInput,
  concurrency: RequestConcurrency,
): Promise<unknown> {
  const context = createContext(name, definition, config, input, 'request');
  return withFeedback(config, input, context, async () => {
    await runMiddleware(config.middleware ?? [], context, async () => {
      try {
        await concurrency.run(context, input.concurrency ?? config.concurrency ?? 'queue', async (transport) => {
          transport.response = await fetch(transport.url, transport.init);
          if (!transport.response.ok)
            throw new Error(`API request failed: ${transport.response.status} ${transport.response.statusText}`);
          transport.data = transport.response.status === 204 ? undefined : await transport.response.json();
        }, undefined, input.concurrencyLimit ?? config.concurrencyLimit);
      } catch (error) {
        context.error = error;
        throw error;
      }
    });
    if (context.error !== undefined) throw context.error;
    return context.data;
  });
}

async function executeNdjson(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: RequestInput & NdjsonOptions<unknown>,
  concurrency: RequestConcurrency,
): Promise<void> {
  if (typeof input.onLine !== 'function') throw new TypeError('NDJSON requires an onLine callback');
  if (input.idleWarningMs !== undefined && (!Number.isFinite(input.idleWarningMs) || input.idleWarningMs < 0)) {
    throw new RangeError('idleWarningMs must be a finite non-negative number');
  }

  const context = createContext(name, definition, config, input, 'ndjson');
  context.init.headers = mergeHeaders({ Accept: 'application/x-ndjson' }, context.init.headers);
  return withFeedback(config, input, context, async () => {
    await runMiddleware(config.middleware ?? [], context, async () => {
      try {
        await concurrency.run(context, input.concurrency ?? config.concurrency ?? 'queue', async (transport, onLine) => {
          transport.response = await fetch(transport.url, transport.init);
          if (!transport.response.ok) {
            await transport.response.body?.cancel().catch(() => undefined);
            throw new Error(`API request failed: ${transport.response.status} ${transport.response.statusText}`);
          }
          await readNdjson(transport.response, { ...input, onLine }, transport.init.signal);
        }, input.onLine, input.concurrencyLimit ?? config.concurrencyLimit);
      } catch (error) {
        context.error = error;
        throw error;
      }
    });
    if (context.error !== undefined) throw context.error;
  });
}

function createContext(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: RequestInput,
  mode: ApiMiddlewareContext['mode'],
): ApiMiddlewareContext {
  const url = buildUrl(definition, config, input);
  const method = resolveMethod(definition, input.method);
  const options = mergeRequestOptions(config.options, input.options);
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);
  const metadata = new Map<string | symbol, unknown>();

  return {
    name,
    method,
    mode,
    url,
    init: {
      ...options,
      method,
      body,
      headers:
        body === undefined ? options.headers : mergeHeaders({ 'Content-Type': 'application/json' }, options.headers),
    },
    getMetadata<T = unknown>(key: string | symbol): T | undefined {
      return metadata.get(key) as T | undefined;
    },
    setMetadata<T = unknown>(key: string | symbol, value: T): void {
      metadata.set(key, value);
    },
  };
}
