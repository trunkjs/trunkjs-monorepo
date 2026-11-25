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
  mode: 'request' | 'raw' | 'ndjson';
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

/** Policy for an identical in-flight request. See README: Concurrency. */
export type Concurrency = 'queue' | 'queue-latest' | 'parallel' | 'reject' | 'abort' | 'join' | 'join-full';

/** UI-independent information for the application's shared feedback adapter. */
export interface FeedbackDetails {
  key?: string;
  name?: string;
  loadingMessage?: string;
  successMessage?: string | false;
  errorMessage?: string | false;
  data?: unknown;
}

export type FeedbackOption = string | FeedbackDetails | false;

export interface FeedbackEvent {
  /** Unique per API invocation, including joined calls. */
  id: string;
  key?: string;
  name?: string;
  feedback: FeedbackDetails | false;
  context: ApiMiddlewareContext;
}

export type FeedbackEndEvent = FeedbackEvent & (
  | { status: 'success'; data: unknown; response?: Response }
  | { status: 'error'; error: unknown; response?: Response }
  | { status: 'aborted'; error: unknown; response?: Response }
);

export type ApiErrorEvent = FeedbackEvent & {
  status: 'error';
  error: unknown;
  response?: Response;
};

export interface ApiDefaults {
  /** Inherited UI preset/details; false disables start/end, not onError. */
  feedback?: FeedbackOption;
  /** Set false to suppress the global onError callback for this call. */
  reportError?: boolean;
  concurrency?: Concurrency;
  /** Maximum simultaneous matching requests in parallel mode. */
  concurrencyLimit?: number;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  options?: RequestInit;
}

export interface ApiConfig extends ApiDefaults {
  baseUrl?: string;
  middleware?: readonly ApiMiddleware[];
  onFeedbackStart?: (event: FeedbackEvent) => void | Promise<void>;
  onFeedbackEnd?: (event: FeedbackEndEvent) => void | Promise<void>;
  onError?: (event: ApiErrorEvent) => void | Promise<void>;
}

export type RouteInput<T> = T extends ApiRoute<infer P, infer Q, infer B, unknown, infer M>
  ? {
      params?: Partial<P>;
      query?: Partial<Q> & Record<string, unknown>;
      method?: M;
    } & ([B] extends [never] ? { body?: never } : { body: B }) & {
      options?: RequestInit;
      feedback?: FeedbackOption;
      reportError?: boolean;
      concurrency?: Concurrency;
      /** Maximum simultaneous matching requests in parallel mode. */
      concurrencyLimit?: number;
    }
  : never;

export type RouteResponse<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, unknown, infer R, HttpMethod>
  ? R
  : never;

export type IsBodyRequired<T> = T extends ApiRoute<Record<string, unknown>, Record<string, unknown>, infer B, unknown, HttpMethod>
  ? [B] extends [never] ? false : true
  : false;

export type PathInput<T> = Omit<RouteInput<T>, 'body' | 'options' | 'method' | 'concurrency' | 'concurrencyLimit' | 'feedback' | 'reportError'>;

export interface NdjsonOptions<T> {
  /** Called with each parsed JSON object in arrival order. Async callbacks are awaited. */
  onLine: (event: T) => void | Promise<void>;
  /** Warn after this many milliseconds without a complete record (0 or omitted disables). */
  idleWarningMs?: number;
}

export type ApiAction<T> = {
  /**
   * Read an NDJSON response incrementally. Resolves when the stream ends.
   * @example await api.Build.Run.ndjson({ onLine: event => console.log(event) });
   */
  ndjson(input: RouteInput<T> & NdjsonOptions<RouteResponse<T>>): Promise<void>;
  path(input?: PathInput<T>): string;
  url(input?: PathInput<T>): string;
  raw(input?: Omit<RouteInput<T>, 'concurrency' | 'concurrencyLimit'>): Promise<Response>;
  with(config: ApiConfig): ApiAction<T>;
  defaults(config: ApiConfig): ApiAction<T>;
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
  feedback?: FeedbackOption;
  reportError?: boolean;
  concurrency?: Concurrency;
  /** Maximum simultaneous matching requests in parallel mode. */
  concurrencyLimit?: number;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  body?: unknown;
  method?: HttpMethod;
  options?: RequestInit;
};
