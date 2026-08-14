export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiRoute<
  TParams extends Record<string, unknown> = Record<string, never>,
  TQuery extends Record<string, unknown> = Record<string, never>,
  TBody = never,
  TResponse = unknown,
> {
  params: TParams;
  query: TQuery;
  body: TBody;
  response: TResponse;
}

export type RouteDefinition = readonly [method: HttpMethod, route: string];
export type RouteTable = Readonly<Record<string, RouteDefinition>>;

export interface ApiMiddlewareContext {
  name: string;
  method: HttpMethod;
  url: string;
  init: RequestInit;
  response?: Response;
  data?: unknown;
  error?: unknown;
  getMetadata<T = unknown>(key: string | symbol): T | undefined;
  setMetadata<T = unknown>(key: string | symbol, value: T): void;
}

export type ApiMiddlewareNext = () => Promise<void>;
export type ApiMiddleware = (context: ApiMiddlewareContext, next: ApiMiddlewareNext) => void | Promise<void>;

export interface ApiDefaults {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  options?: RequestInit;
}

export interface ApiConfig extends ApiDefaults {
  baseUrl?: string;
  middleware?: readonly ApiMiddleware[];
}

type RouteInput<T> = T extends ApiRoute<infer P, infer Q, infer B, unknown>
  ? {
      params?: Partial<P>;
      query?: Partial<Q> & Record<string, unknown>;
    } & ([B] extends [never] ? { body?: never } : { body: B }) & {
      options?: RequestInit;
    }
  : never;

type RouteResponse<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, unknown, infer R>
  ? R
  : never;

type IsBodyRequired<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, infer B, unknown>
  ? [B] extends [never] ? false : true
  : false;

export type ApiAction<T> = {
  path(input?: Omit<RouteInput<T>, 'body' | 'options'>): string;
} & (IsBodyRequired<T> extends true
  ? { request(input: RouteInput<T>): Promise<RouteResponse<T>> }
  : { request(input?: RouteInput<T>): Promise<RouteResponse<T>> });

export type ApiProxy<T> = {
  [K in keyof T]: T[K] extends ApiRoute<Record<string, unknown>, Record<string, unknown>, unknown, unknown>
    ? ApiAction<T[K]>
    : ApiProxy<T[K]>;
};

export type Api<T> = ApiProxy<T> & {
  defaults(defaults: ApiConfig): Api<T>;
  use(middleware: ApiMiddleware): Api<T>;
};

export function createApi<T>(routes: RouteTable, config: ApiConfig = {}): Api<T> {
  return createProxy<T>(routes, mergeConfig({}, config), []);
}

function createProxy<T>(routes: RouteTable, config: ApiConfig, path: string[]): Api<T> {
  return new Proxy(() => undefined, {
    get(_target, property) {
      if (path.length === 0 && property === 'defaults') {
        return (additional: ApiConfig) => createProxy<T>(routes, mergeConfig(config, additional), []);
      }

      if (path.length === 0 && property === 'use') {
        return (middleware: ApiMiddleware) => createProxy<T>(routes, {
          ...config,
          middleware: [...(config.middleware ?? []), middleware],
        }, []);
      }

      if (property === 'path') {
        return (input: { params?: Record<string, unknown>; query?: Record<string, unknown> } = {}) =>
          buildPath(resolveRoute(routes, path), config, input);
      }

      if (property === 'request') {
        return (input: {
          params?: Record<string, unknown>;
          query?: Record<string, unknown>;
          body?: unknown;
          options?: RequestInit;
        } = {}) => executeRequest(path.join('.'), resolveRoute(routes, path), config, input);
      }

      if (typeof property === 'string') {
        return createProxy<T>(routes, config, [...path, property]);
      }

      return undefined;
    },
  }) as Api<T>;
}

function resolveRoute(routes: RouteTable, path: string[]): RouteDefinition {
  const name = path.join('.');
  const route = routes[name];
  if (!route) throw new Error(`Unknown API route: ${name}`);
  return route;
}

function buildPath(
  definition: RouteDefinition,
  config: ApiConfig,
  input: { params?: Record<string, unknown>; query?: Record<string, unknown> },
): string {
  const params = { ...config.params, ...input.params };
  const query = { ...config.query, ...input.query };

  const pathname = definition[1].replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined || value === null) throw new Error(`Missing route parameter: ${name}`);
    return encodeURIComponent(String(value));
  });

  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) value.forEach((item) => search.append(name, String(item)));
    else search.set(name, String(value));
  }

  const queryString = search.toString();
  const path = queryString ? `${pathname}?${queryString}` : pathname;
  return config.baseUrl ? joinUrl(config.baseUrl, path) : path;
}

async function executeRequest(
  name: string,
  definition: RouteDefinition,
  config: ApiConfig,
  input: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    options?: RequestInit;
  },
): Promise<unknown> {
  const url = buildPath(definition, config, input);
  const options = mergeRequestOptions(config.options, input.options);
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);
  const metadata = new Map<string | symbol, unknown>();

  const context: ApiMiddlewareContext = {
    name,
    method: definition[0],
    url,
    init: {
      ...options,
      method: definition[0],
      body,
      headers: body === undefined
        ? options.headers
        : mergeHeaders({ 'Content-Type': 'application/json' }, options.headers),
    },
    getMetadata<T = unknown>(key: string | symbol): T | undefined {
      return metadata.get(key) as T | undefined;
    },
    setMetadata<T = unknown>(key: string | symbol, value: T): void {
      metadata.set(key, value);
    },
  };

  const middleware = config.middleware ?? [];
  await runMiddleware(middleware, context, async () => {
    try {
      context.response = await fetch(context.url, context.init);
      if (!context.response.ok) {
        throw new Error(`API request failed: ${context.response.status} ${context.response.statusText}`);
      }
      context.data = context.response.status === 204 ? undefined : await context.response.json();
    } catch (error) {
      context.error = error;
      throw error;
    }
  });

  if (context.error !== undefined) throw context.error;
  return context.data;
}

async function runMiddleware(
  middleware: readonly ApiMiddleware[],
  context: ApiMiddlewareContext,
  terminal: ApiMiddlewareNext,
): Promise<void> {
  let index = -1;

  const dispatch = async (position: number): Promise<void> => {
    if (position <= index) throw new Error('Middleware next() called multiple times');
    index = position;

    const current = middleware[position];
    if (!current) {
      await terminal();
      return;
    }

    await current(context, () => dispatch(position + 1));
  };

  await dispatch(0);
}

function mergeConfig(base: ApiConfig, additional: ApiConfig): ApiConfig {
  return {
    ...base,
    ...additional,
    params: { ...base.params, ...additional.params },
    query: { ...base.query, ...additional.query },
    options: mergeRequestOptions(base.options, additional.options),
    middleware: [...(base.middleware ?? []), ...(additional.middleware ?? [])],
  };
}

function mergeRequestOptions(base: RequestInit = {}, additional: RequestInit = {}): RequestInit {
  return {
    ...base,
    ...additional,
    headers: mergeHeaders(base.headers, additional.headers),
  };
}

function mergeHeaders(base?: HeadersInit, additional?: HeadersInit): Headers {
  const headers = new Headers(base);
  new Headers(additional).forEach((value, key) => headers.set(key, value));
  return headers;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
