export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Compile-time description of an API action.
 * The generic members do not add route-specific runtime data.
 */
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

export interface ApiRequestContext {
  name: string;
  method: HttpMethod;
  url: string;
  init: RequestInit;
}

export type ApiRequestHook = (context: ApiRequestContext) => void | Promise<void>;
export type ApiResponseHook = (response: Response, context: ApiRequestContext) => void | Promise<void>;
export type ApiErrorHook = (error: unknown, context: ApiRequestContext) => void | Promise<void>;

export interface ApiHooks {
  onRequest?: ApiRequestHook | false;
  onResponse?: ApiResponseHook | false;
  onError?: ApiErrorHook | false;
}

export type ApiRequestOptions = RequestInit & ApiHooks;

export interface ApiDefaults {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  options?: ApiRequestOptions;
}

export interface ApiConfig extends ApiDefaults, ApiHooks {
  baseUrl?: string;
}

type RouteInput<T> = T extends ApiRoute<infer P, infer Q, infer B, unknown>
  ? {
      params?: Partial<P>;
      query?: Partial<Q> & Record<string, unknown>;
    } & ([B] extends [never] ? { body?: never } : { body: B }) & {
      options?: ApiRequestOptions;
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

      if (property === 'path') {
        return (input: { params?: Record<string, unknown>; query?: Record<string, unknown> } = {}) =>
          buildPath(resolveRoute(routes, path), config, input);
      }

      if (property === 'request') {
        return (input: {
          params?: Record<string, unknown>;
          query?: Record<string, unknown>;
          body?: unknown;
          options?: ApiRequestOptions;
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
    options?: ApiRequestOptions;
  },
): Promise<unknown> {
  const url = buildPath(definition, config, input);
  const options = mergeRequestOptions(config.options, input.options);
  const hooks = resolveHooks(config, options);
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);
  const init: RequestInit = {
    ...stripHooks(options),
    method: definition[0],
    body,
    headers: body === undefined
      ? options.headers
      : mergeHeaders({ 'Content-Type': 'application/json' }, options.headers),
  };
  const context: ApiRequestContext = { name, method: definition[0], url, init };

  try {
    if (hooks.onRequest) await hooks.onRequest(context);
    const response = await fetch(url, init);
    if (hooks.onResponse) await hooks.onResponse(response, context);
    if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    if (response.status === 204) return undefined;
    return response.json();
  } catch (error) {
    if (hooks.onError) await hooks.onError(error, context);
    throw error;
  }
}

function mergeConfig(base: ApiConfig, additional: ApiConfig): ApiConfig {
  return {
    ...base,
    ...additional,
    params: { ...base.params, ...additional.params },
    query: { ...base.query, ...additional.query },
    options: mergeRequestOptions(base.options, additional.options),
  };
}

function mergeRequestOptions(base: ApiRequestOptions = {}, additional: ApiRequestOptions = {}): ApiRequestOptions {
  return {
    ...base,
    ...additional,
    headers: mergeHeaders(base.headers, additional.headers),
  };
}

function resolveHooks(config: ApiConfig, options: ApiRequestOptions): Required<ApiHooks> {
  return {
    onRequest: options.onRequest === undefined ? config.onRequest ?? false : options.onRequest,
    onResponse: options.onResponse === undefined ? config.onResponse ?? false : options.onResponse,
    onError: options.onError === undefined ? config.onError ?? false : options.onError,
  };
}

function stripHooks(options: ApiRequestOptions): RequestInit {
  const { onRequest: _onRequest, onResponse: _onResponse, onError: _onError, ...init } = options;
  return init;
}

function mergeHeaders(base?: HeadersInit, additional?: HeadersInit): Headers {
  const headers = new Headers(base);
  new Headers(additional).forEach((value, key) => headers.set(key, value));
  return headers;
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
