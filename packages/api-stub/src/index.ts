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

export interface ApiDefaults {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  options?: RequestInit;
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
  defaults(defaults: ApiDefaults): Api<T>;
};

export function createApi<T>(routes: RouteTable, defaults: ApiDefaults = {}): Api<T> {
  return createProxy<T>(routes, mergeDefaults({}, defaults), []);
}

function createProxy<T>(routes: RouteTable, defaults: ApiDefaults, path: string[]): Api<T> {
  return new Proxy(() => undefined, {
    get(_target, property) {
      if (path.length === 0 && property === 'defaults') {
        return (additional: ApiDefaults) => createProxy<T>(routes, mergeDefaults(defaults, additional), []);
      }

      if (property === 'path') {
        return (input: { params?: Record<string, unknown>; query?: Record<string, unknown> } = {}) =>
          buildPath(resolveRoute(routes, path), defaults, input);
      }

      if (property === 'request') {
        return (input: {
          params?: Record<string, unknown>;
          query?: Record<string, unknown>;
          body?: unknown;
          options?: RequestInit;
        } = {}) => executeRequest(resolveRoute(routes, path), defaults, input);
      }

      if (typeof property === 'string') {
        return createProxy<T>(routes, defaults, [...path, property]);
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
  defaults: ApiDefaults,
  input: { params?: Record<string, unknown>; query?: Record<string, unknown> },
): string {
  const params = { ...defaults.params, ...input.params };
  const query = { ...defaults.query, ...input.query };

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

async function executeRequest(
  definition: RouteDefinition,
  defaults: ApiDefaults,
  input: {
    params?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: unknown;
    options?: RequestInit;
  },
): Promise<unknown> {
  const url = buildPath(definition, defaults, input);
  const options = mergeRequestOptions(defaults.options, input.options);
  const body = input.body === undefined ? undefined : JSON.stringify(input.body);

  const response = await fetch(url, {
    ...options,
    method: definition[0],
    body,
    headers: body === undefined
      ? options.headers
      : mergeHeaders({ 'Content-Type': 'application/json' }, options.headers),
  });

  if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  if (response.status === 204) return undefined;
  return response.json();
}

function mergeDefaults(base: ApiDefaults, additional: ApiDefaults): ApiDefaults {
  return {
    params: { ...base.params, ...additional.params },
    query: { ...base.query, ...additional.query },
    options: mergeRequestOptions(base.options, additional.options),
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
