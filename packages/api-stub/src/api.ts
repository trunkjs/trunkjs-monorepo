import { runMiddleware } from './middleware';
import { buildPath, buildUrl, mergeConfig, mergeHeaders, mergeRequestOptions, resolveMethod } from './request-utils';
import type {
  Api,
  ApiConfig,
  ApiMiddleware,
  ApiMiddlewareContext,
  ApiNamespace,
  RequestInput,
  RouteDefinition,
  RouteTable,
} from './types';

export function createApi<T>(routes: RouteTable, config: ApiConfig = {}): Api<T> {
  return createProxy<T>(routes, mergeConfig({}, config), []);
}

function createProxy<T>(routes: RouteTable, config: ApiConfig, path: string[]): ApiNamespace<T> {
  return new Proxy(() => undefined, {
    get(_target, property) {
      if (property === 'with' || property === 'defaults') {
        return (additional: ApiConfig) => createProxy<T>(routes, mergeConfig(config, additional), path);
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
      if (property === 'request') {
        return (input: RequestInput = {}) => executeRequest(path.join('.'), resolveRoute(routes, path), config, input);
      }
      if (typeof property === 'string') return createProxy<T>(routes, config, [...path, property]);
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
}

async function executeRequest(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: RequestInput,
): Promise<unknown> {
  const context = createContext(name, definition, config, input, 'request');
  await runMiddleware(config.middleware ?? [], context, async () => {
    try {
      context.response = await fetch(context.url, context.init);
      if (!context.response.ok)
        throw new Error(`API request failed: ${context.response.status} ${context.response.statusText}`);
      context.data = context.response.status === 204 ? undefined : await context.response.json();
    } catch (error) {
      context.error = error;
      throw error;
    }
  });
  if (context.error !== undefined) throw context.error;
  return context.data;
}

function createContext(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: RequestInput,
  mode: 'request' | 'raw',
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
