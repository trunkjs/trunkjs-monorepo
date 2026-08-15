export type NavigationMode = 'spa' | 'reload';

export type RouteParams = Record<string, string | number>;
export type RouteQuery = Record<string, string | number | boolean | undefined>;

export interface RouteOptions {
  name?: string;
  path: string;
  navigation?: NavigationMode;
  meta?: Record<string, unknown>;
}

export interface RouteDefinition extends RouteOptions {
  components: CustomElementConstructor[];
}

export type RouteTarget =
  | string
  | { name: string; params?: RouteParams; query?: RouteQuery; hash?: string }
  | { path: string; query?: RouteQuery; hash?: string };

export interface RouteContext {
  readonly name?: string;
  readonly path: string;
  readonly url: URL;
  readonly params: Readonly<Record<string, string>>;
  readonly query: URLSearchParams;
  readonly hash: string;
  readonly meta: Readonly<Record<string, unknown>>;
  readonly definition: RouteDefinition;
  readonly router: Router;
}

export interface RouteChange {
  readonly route: RouteContext;
  readonly previousRoute: RouteContext | null;
}

export interface NavigationOptions {
  navigation?: NavigationMode;
}

const ROUTES = Symbol('trunkjs.routes');

type RoutableConstructor = CustomElementConstructor & {
  [ROUTES]?: RouteOptions[];
};

export function route(path: string): <T extends CustomElementConstructor>(value: T) => T;
export function route(options: RouteOptions): <T extends CustomElementConstructor>(value: T) => T;
export function route(pathOrOptions: string | RouteOptions) {
  const options: RouteOptions = typeof pathOrOptions === 'string' ? { path: pathOrOptions } : pathOrOptions;
  return <T extends CustomElementConstructor>(value: T): T => {
    const ctor = value as RoutableConstructor;
    ctor[ROUTES] = [...(ctor[ROUTES] ?? []), options];
    return value;
  };
}

export function getRouteMetadata(component: CustomElementConstructor): readonly RouteOptions[] {
  return (component as RoutableConstructor)[ROUTES] ?? [];
}

export class RouteChangeEvent extends CustomEvent<RouteChange> {
  static readonly type = 'routechange';

  constructor(change: RouteChange) {
    super(RouteChangeEvent.type, { detail: change });
  }
}

function compilePath(path: string) {
  const names: string[] = [];
  const escaped = path
    .split('/')
    .map((part) => {
      if (part.startsWith(':')) {
        names.push(part.slice(1));
        return '([^/]+)';
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { names, regex: new RegExp(`^${escaped}/?$`) };
}

function queryString(query?: RouteQuery): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const value = params.toString();
  return value ? `?${value}` : '';
}

export class Router extends EventTarget {
  readonly #routes: RouteDefinition[] = [];
  #started = false;
  current: RouteContext | null = null;

  constructor(routes: Array<RouteDefinition | CustomElementConstructor> = []) {
    super();
    routes.forEach((entry) => {
      if (typeof entry === 'function') this.register(entry);
      else this.addRoute(entry);
    });
  }

  addRoute(definition: RouteDefinition): this {
    if (definition.name && this.#routes.some((route) => route.name === definition.name)) {
      throw new Error(`Duplicate route name: ${definition.name}`);
    }
    this.#routes.push({ ...definition, navigation: definition.navigation ?? 'spa', meta: definition.meta ?? {} });
    return this;
  }

  register(component: CustomElementConstructor): this {
    for (const metadata of getRouteMetadata(component)) {
      this.addRoute({ ...metadata, components: [component] });
    }
    return this;
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    window.addEventListener('popstate', this.#onPopState);
    document.addEventListener('click', this.#onClick);
    this.#commit(new URL(window.location.href));
  }

  stop(): void {
    if (!this.#started) return;
    this.#started = false;
    window.removeEventListener('popstate', this.#onPopState);
    document.removeEventListener('click', this.#onClick);
  }

  match(input: string | URL): RouteContext | null {
    const url = input instanceof URL ? input : new URL(input, window.location.href);
    for (const definition of this.#routes) {
      const { names, regex } = compilePath(definition.path);
      const match = regex.exec(url.pathname);
      if (!match) continue;
      const params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1] ?? '')]));
      return {
        name: definition.name,
        path: url.pathname,
        url,
        params,
        query: url.searchParams,
        hash: url.hash,
        meta: definition.meta ?? {},
        definition,
        router: this,
      };
    }
    return null;
  }

  url(target: RouteTarget): string {
    if (typeof target === 'string') return target;
    let path: string;
    if ('name' in target) {
      const definition = this.#routes.find((route) => route.name === target.name);
      if (!definition) throw new Error(`Unknown route: ${target.name}`);
      path = definition.path;
      for (const [key, value] of Object.entries(target.params ?? {})) {
        path = path.replace(`:${key}`, encodeURIComponent(String(value)));
      }
      if (/:[^/]+/.test(path)) throw new Error(`Missing route parameter for ${target.name}`);
    } else {
      path = target.path;
    }
    return `${path}${queryString(target.query)}${target.hash ? `#${target.hash.replace(/^#/, '')}` : ''}`;
  }

  navigate(target: RouteTarget, options: NavigationOptions = {}): RouteContext | null {
    return this.#go(target, false, options);
  }

  replace(target: RouteTarget, options: NavigationOptions = {}): RouteContext | null {
    return this.#go(target, true, options);
  }

  back(): void { history.back(); }
  forward(): void { history.forward(); }

  #go(target: RouteTarget, replace: boolean, options: NavigationOptions): RouteContext | null {
    const href = this.url(target);
    const nextUrl = new URL(href, window.location.href);
    const matched = this.match(nextUrl);
    const navigation = options.navigation ?? matched?.definition.navigation ?? 'spa';
    if (navigation === 'reload') {
      if (replace) window.location.replace(nextUrl.href);
      else window.location.assign(nextUrl.href);
      return matched;
    }
    if (replace) history.replaceState({}, '', nextUrl);
    else history.pushState({}, '', nextUrl);
    return this.#commit(nextUrl);
  }

  #commit(url: URL): RouteContext | null {
    const next = this.match(url);
    if (!next) return null;
    const previousRoute = this.current;
    this.current = next;
    this.dispatchEvent(new RouteChangeEvent({ route: next, previousRoute }));
    return next;
  }

  #onPopState = () => { this.#commit(new URL(window.location.href)); };

  #onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!(target instanceof HTMLAnchorElement) || target.target || target.download || target.hasAttribute('data-router-ignore')) return;
    const url = new URL(target.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    const match = this.match(url);
    if (!match) return;
    event.preventDefault();
    this.navigate(url.pathname + url.search + url.hash, {
      navigation: target.hasAttribute('data-router-reload') ? 'reload' : undefined,
    });
  };
}
