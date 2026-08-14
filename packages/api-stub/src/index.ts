export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiRoute<
  TParams extends Record<string, unknown> = Record<string, never>,
  TQuery extends Record<string, unknown> = Record<string, never>,
  TBody = never,
  TResponse = unknown,
  TMethod extends HttpMethod = HttpMethod,
> {
  params: TParams;
  query: TQuery;
  body: TBody;
  response: TResponse;
  method: TMethod;
}

export type RouteMethods = HttpMethod | readonly HttpMethod[];
export type RouteDefinition = readonly [methods: RouteMethods, route: string];
export type RouteTable = Readonly<Record<string, RouteDefinition>>;

export interface ApiMiddlewareContext {
  name: string;
  method: HttpMethod;
  mode: 'request' | 'raw';
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

type RouteInput<T> = T extends ApiRoute<infer P, infer Q, infer B, unknown, infer M>
  ? {
      params?: Partial<P>;
      query?: Partial<Q> & Record<string, unknown>;
      method?: M;
    } & ([B] extends [never] ? { body?: never } : { body: B }) & {
      options?: RequestInit;
    }
  : never;

type RouteResponse<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, unknown, infer R, HttpMethod>
  ? R
  : never;

type IsBodyRequired<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, infer B, unknown, HttpMethod>
  ? [B] extends [never] ? false : true
  : false;

type PathInput<T> = Omit<RouteInput<T>, 'body' | 'options' | 'method'>;

export type ApiAction<T> = {
  path(input?: PathInput<T>): string;
  url(input?: PathInput<T>): string;
  raw(input?: RouteInput<T>): Promise<Response>;
} & (IsBodyRequired<T> extends true
  ? { request(input: RouteInput<T>): Promise<RouteResponse<T>> }
  : { request(input?: RouteInput<T>): Promise<RouteResponse<T>> });

export type ApiNamespace<T> = {
  [K in keyof T]: T[K] extends ApiRoute<Record<string, unknown>, Record<string, unknown>, unknown, unknown, HttpMethod>
    ? ApiAction<T[K]>
    : ApiNamespace<T[K]>;
} & {
  with(config: ApiConfig): ApiNamespace<T>;
  defaults(config: ApiConfig): ApiNamespace<T>;
  use(middleware: ApiMiddleware): ApiNamespace<T>;
};

export type Api<T> = ApiNamespace<T>;

type RequestInput = {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  method?: HttpMethod;
  options?: RequestInit;
};

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
        return (middleware: ApiMiddleware) => createProxy<T>(routes, {
          ...config,
          middleware: [...(config.middleware ?? []), middleware],
        }, path);
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
  }) as ApiNamespace<T>;
}

function resolveRoute(routes: RouteTable, path: string[]): RouteDefinition {
  const name = path.join('.');
  const route = routes[name];
  if (!route) throw new Error(`Unknown API route: ${name}`);
  return route;
}

function resolveMethod(definition: RouteDefinition, requested?: HttpMethod): HttpMethod {
  const allowed = Array.isArray(definition[0]) ? definition[0] : [definition[0]];
  const method = requested ?? allowed[0];
  if (!method || !allowed.includes(method)) {
    throw new Error(`HTTP method ${method ?? '(none)'} is not allowed for route ${definition[1]}`);
  }
  return method;
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
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function buildUrl(
  definition: RouteDefinition,
  config: ApiConfig,
  input: { params?: Record<string, unknown>; query?: Record<string, unknown> },
): string {
  const path = buildPath(definition, config, input);
  return config.baseUrl ? joinUrl(config.baseUrl, path) : path;
}

async function executeRaw(name: string, definition: RouteDefinition, config: ApiConfig, input: RequestInput): Promise<Response> {
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

async function executeRequest(name: string, definition: RouteDefinition, config: ApiConfig, input: RequestInput): Promise<unknown> {
  const context = createContext(name, definition, config, input, 'request');
  await runMiddleware(config.middleware ?? [], context, async () => {
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
      headers: body === undefined ? options.headers : mergeHeaders({ 'Content-Type': 'application/json' }, options.headers),
    },
    getMetadata<T = unknown>(key: string | symbol): T | undefined {
      return metadata.get(key) as T | undefined;
    },
    setMetadata<T = unknown>(key: string | symbol, value: T): void {
      metadata.set(key, value);
    },
  };
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
    if (!current) return terminal();
    await current(context, () => dispatch(position + 1));
  };
  await dispatch(0);
}

export interface DeduplicateMiddlewareController {
  middleware: ApiMiddleware;
  clear(): void;
}

export function createDeduplicateMiddleware(): DeduplicateMiddlewareController {
  const pending = new Map<string, Promise<{ data: unknown; response?: Response }>>();

  return {
    clear() {
      pending.clear();
    },
    middleware: async (context, next) => {
      if (context.mode !== 'request' || context.method !== 'GET') return next();
      const key = createRequestKey(context);
      const existing = pending.get(key);
      if (existing) {
        const result = await existing;
        context.data = result.data;
        context.response = result.response;
        return;
      }

      const request = (async () => {
        await next();
        return { data: context.data, response: context.response };
      })();
      pending.set(key, request);
      try {
        await request;
      } finally {
        if (pending.get(key) === request) pending.delete(key);
      }
    },
  };
}

export interface CacheMiddlewareOptions {
  ttl?: number;
}

export interface CacheMiddlewareController {
  middleware: ApiMiddleware;
  clear(): void;
  setTtl(ttl: number): void;
  getTtl(): number;
}

export function createCacheMiddleware(options: CacheMiddlewareOptions = {}): CacheMiddlewareController {
  let ttl = Math.max(0, options.ttl ?? 30_000);
  const entries = new Map<string, { expiresAt: number; data: unknown; response?: Response }>();

  return {
    clear() {
      entries.clear();
    },
    setTtl(value: number) {
      ttl = Math.max(0, value);
    },
    getTtl() {
      return ttl;
    },
    middleware: async (context, next) => {
      if (context.mode !== 'request' || context.method !== 'GET' || ttl === 0) return next();
      const key = createRequestKey(context);
      const cached = entries.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        context.data = cached.data;
        context.response = cached.response;
        return;
      }
      if (cached) entries.delete(key);

      await next();
      if (context.error === undefined) {
        entries.set(key, {
          expiresAt: Date.now() + ttl,
          data: context.data,
          response: context.response,
        });
      }
    },
  };
}

function createRequestKey(context: ApiMiddlewareContext): string {
  const headers = Array.from(new Headers(context.init.headers).entries()).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([context.method, context.url, headers, context.init.credentials]);
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
