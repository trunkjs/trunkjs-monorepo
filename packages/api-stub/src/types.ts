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

export type RouteInput<T> = T extends ApiRoute<infer P, infer Q, infer B, unknown, infer M>
  ? {
      params?: Partial<P>;
      query?: Partial<Q> & Record<string, unknown>;
      method?: M;
    } & ([B] extends [never] ? { body?: never } : { body: B }) & {
      options?: RequestInit;
    }
  : never;

export type RouteResponse<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, unknown, infer R, HttpMethod>
  ? R
  : never;

export type IsBodyRequired<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, infer B, unknown, HttpMethod>
  ? [B] extends [never] ? false : true
  : false;

export type PathInput<T> = Omit<RouteInput<T>, 'body' | 'options' | 'method'>;

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

export type RequestInput = {
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  method?: HttpMethod;
  options?: RequestInit;
};
