import type { ApiConfig, ApiMiddlewareContext, HttpMethod, RouteDefinition } from './types';

export function resolveMethod(definition: RouteDefinition, requested?: HttpMethod): HttpMethod {
  const allowed = Array.isArray(definition[0]) ? definition[0] : [definition[0]];
  const method = requested ?? allowed[0];
  if (!method || !allowed.includes(method)) {
    throw new Error(`HTTP method ${method ?? '(none)'} is not allowed for route ${definition[1]}`);
  }
  return method;
}

export function buildPath(
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

export function buildUrl(
  definition: RouteDefinition,
  config: ApiConfig,
  input: { params?: Record<string, unknown>; query?: Record<string, unknown> },
): string {
  const path = buildPath(definition, config, input);
  return config.baseUrl ? joinUrl(config.baseUrl, path) : path;
}

export function createRequestKey(context: ApiMiddlewareContext): string {
  const headers = Array.from(new Headers(context.init.headers).entries()).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify([context.method, context.url, headers, context.init.credentials]);
}

export function mergeConfig(base: ApiConfig, additional: ApiConfig): ApiConfig {
  return {
    ...base,
    ...additional,
    params: { ...base.params, ...additional.params },
    query: { ...base.query, ...additional.query },
    options: mergeRequestOptions(base.options, additional.options),
    middleware: [...(base.middleware ?? []), ...(additional.middleware ?? [])],
  };
}

export function mergeRequestOptions(base: RequestInit = {}, additional: RequestInit = {}): RequestInit {
  return {
    ...base,
    ...additional,
    headers: mergeHeaders(base.headers, additional.headers),
  };
}

export function mergeHeaders(base?: HeadersInit, additional?: HeadersInit): Headers {
  const headers = new Headers(base);
  new Headers(additional).forEach((value, key) => headers.set(key, value));
  return headers;
}

export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
