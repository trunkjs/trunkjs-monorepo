import { AuxiliaryRoute, type AuxiliaryRouteMatch, type AuxiliaryRouteParams } from './auxiliary-route';
import { buildPath, compilePath, getRouteChangeSet, normalizeRoute, queryString } from './route-tools';

import type { RouteRenderer } from './route-renderer';

export type NavigationMode = 'spa' | 'reload';
export type RouteOutletName = string;
export type RouteParams = Record<string, string | number>;
export type RouteQuery = Record<string, string | number | boolean | undefined>;
export type RouteComponent = CustomElementConstructor;
export type RouteOutletComponents = RouteComponent | readonly RouteComponent[];

export interface RouteOptions {
  name?: string;
  path: string;
  outlet?: RouteOutletName;
  navigation?: NavigationMode;
  meta?: Record<string, unknown>;
  /** Render in a named auxiliary outlet without replacing the primary route. */
  auxiliary?: boolean;
  /** Registered renderer name; omitted/inline uses normal outlet rendering. */
  presentation?: string;
  /** Required return target for presented primary routes. */
  closeTo?: RouteTarget;
}

export interface RouteDefinition extends RouteOptions {
  components?: RouteComponent[];
  outlets?: Record<RouteOutletName, RouteOutletComponents>;
}

export interface NormalizedRouteDefinition extends Omit<RouteDefinition, 'components' | 'outlets'> {
  components: RouteComponent[];
  outlets: Record<RouteOutletName, RouteComponent[]>;
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
  readonly outlets: Readonly<Record<RouteOutletName, AuxiliaryRouteMatch>>;
  readonly definition: NormalizedRouteDefinition;
  readonly router: Router;
}

export interface RouteChangeSet {
  readonly primary: boolean;
  readonly outlets: ReadonlySet<RouteOutletName>;
  readonly query: boolean;
  readonly hash: boolean;
}

export interface RouteChange {
  readonly route: RouteContext;
  readonly previousRoute: RouteContext | null;
  readonly initial: boolean;
  readonly changed: RouteChangeSet;
}

export interface NavigationOptions { navigation?: NavigationMode; }
export interface AuxiliaryRouteTarget { name: string; params?: AuxiliaryRouteParams; }

function normalizeBasePath(basePath: string): string {
  const normalized = `/${basePath.trim().replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? '/' : `${normalized}/`;
}

function defaultBasePath(): string {
  return document.querySelector<HTMLMetaElement>('meta[name="app-base-path"]')?.content ?? '/';
}

const ROUTES = Symbol('trunkjs.routes');
type RoutableConstructor = CustomElementConstructor & { [ROUTES]?: RouteOptions[] };

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
  constructor(change: RouteChange) { super(RouteChangeEvent.type, { detail: change }); }
}

export interface RouteNotFound {
  readonly router: Router;
  readonly url: URL;
}

export class RouteNotFoundEvent extends CustomEvent<RouteNotFound> {
  static readonly type = 'route-not-found';
  constructor(detail: RouteNotFound) { super(RouteNotFoundEvent.type, { detail }); }
}

/** Route registration does not navigate. See ../../examples/01-start.ts. */
export class Router extends EventTarget {
  readonly #routes: NormalizedRouteDefinition[] = [];
  readonly #auxiliaryRoutes: AuxiliaryRoute[] = [];
  #started = false;
  readonly #renderers = new Map<string, RouteRenderer>();
  readonly basePath: string;
  current: RouteContext | null = null;

  constructor(
    routes: Array<RouteDefinition | CustomElementConstructor> = [],
    auxiliaryRoutes: AuxiliaryRoute[] = [],
    basePath = defaultBasePath(),
  ) {
    super();
    this.basePath = normalizeBasePath(basePath);
    routes.forEach((entry) => typeof entry === 'function' ? this.register(entry) : this.addRoute(entry));
    auxiliaryRoutes.forEach((route) => this.addAuxiliaryRoute(route));
  }

  setRenderer(name: string, renderer: RouteRenderer): this {
    this.#renderers.set(name, renderer);
    return this;
  }

  getRenderer(name: string): RouteRenderer | undefined { return this.#renderers.get(name); }

  addRoute(definition: RouteDefinition): this {
    if (definition.name && this.#routes.some((route) => route.name === definition.name)) throw new Error(`Duplicate route name: ${definition.name}`);
    this.#routes.push(normalizeRoute(definition));
    return this;
  }

  addAuxiliaryRoute(route: AuxiliaryRoute): this {
    if (this.#auxiliaryRoutes.some((entry) => entry.name === route.name)) throw new Error(`Duplicate auxiliary route name: ${route.name}`);
    this.#auxiliaryRoutes.push(route);
    return this;
  }

  register(component: CustomElementConstructor): this {
    for (const metadata of getRouteMetadata(component)) {
      if (metadata.auxiliary) {
        if (!metadata.name || !metadata.outlet || metadata.outlet === 'default') {
          throw new Error('Auxiliary route decorators require a name and a named outlet.');
        }
        this.addAuxiliaryRoute(new AuxiliaryRoute({
          ...metadata, name: metadata.name, outlet: metadata.outlet, components: component,
        }));
        continue;
      }
      const outlet = metadata.outlet ?? 'default';
      const existing = metadata.name ? this.#routes.find((route) => route.name === metadata.name) : this.#routes.find((route) => !route.name && route.path === metadata.path);
      if (existing) {
        if (existing.path !== metadata.path) throw new Error(`Route ${metadata.name ?? metadata.path} cannot use multiple paths.`);
        existing.outlets[outlet] = [...(existing.outlets[outlet] ?? []), component];
        existing.components = existing.outlets['default'] ?? [];
      } else this.addRoute({ ...metadata, components: [component] });
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
    let url: URL;
    try { url = input instanceof URL ? input : new URL(input, window.location.href); }
    catch { return null; }
    if (url.origin !== window.location.origin) return null;
    try {
      return this.#matchUrl(url);
    } catch (error) {
      // Invalid escaping or auxiliary syntax is an unmatched URL, not an app crash.
      if (error instanceof URIError) return null;
      throw error;
    }
  }

  #matchUrl(url: URL): RouteContext | null {
    const pathname = this.#stripBasePath(url.pathname);
    if (pathname === null) return null;
    const parsed = AuxiliaryRoute.parseUrlPath(pathname);
    const definition = this.#routes.find((route) => compilePath(route.path).regex.test(parsed.primaryPath));
    if (!definition) return null;

    const { names, regex } = compilePath(definition.path);
    const match = regex.exec(parsed.primaryPath)!;
    const params = Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1] ?? '')]));
    const outlets: Record<string, AuxiliaryRouteMatch> = {};

    for (const [outlet, path] of parsed.segments) {
      const auxiliary = this.#auxiliaryRoutes.find((route) => route.outlet === outlet && route.match(path));
      const auxiliaryMatch = auxiliary?.match(path);
      if (!auxiliaryMatch) return null;
      outlets[outlet] = auxiliaryMatch;
    }

    return { name: definition.name, path: parsed.primaryPath, url, params, query: url.searchParams, hash: url.hash, meta: definition.meta ?? {}, outlets, definition, router: this };
  }

  url(target: RouteTarget): string {
    if (typeof target === 'string') return this.#withBasePath(target);
    const path = 'name' in target
      ? buildPath(this.#routes.find((route) => route.name === target.name)?.path ?? (() => { throw new Error(`Unknown route: ${target.name}`); })(), target.params, target.name)
      : target.path;
    return `${this.#withBasePath(path)}${queryString(target.query)}${target.hash ? `#${target.hash.replace(/^#/, '')}` : ''}`;
  }

  navigate(target: RouteTarget, options: NavigationOptions = {}): RouteContext | null { return this.#go(target, false, options); }
  replace(target: RouteTarget, options: NavigationOptions = {}): RouteContext | null { return this.#go(target, true, options); }

  navigateOutlet(outlet: string, target: AuxiliaryRouteTarget, options: NavigationOptions = {}): RouteContext | null {
    return this.#navigateOutlet(outlet, target, false, options);
  }

  replaceOutlet(outlet: string, target: AuxiliaryRouteTarget, options: NavigationOptions = {}): RouteContext | null {
    return this.#navigateOutlet(outlet, target, true, options);
  }

  clearOutlet(outlet: string, options: NavigationOptions & { replace?: boolean } = {}): RouteContext | null {
    if (!this.current) throw new Error('Cannot clear an outlet before a primary route is active.');
    const segments = Object.entries(this.current.outlets)
      .filter(([name]) => name !== outlet)
      .map(([, match]) => match.route.serialize(match.params));
    return this.#go(AuxiliaryRoute.composeUrlPath(this.current.path, segments) + this.current.url.search + this.current.url.hash, options.replace ?? false, options);
  }

  back(): void { history.back(); }
  forward(): void { history.forward(); }

  #navigateOutlet(outlet: string, target: AuxiliaryRouteTarget, replace: boolean, options: NavigationOptions): RouteContext | null {
    if (!this.current) throw new Error('Cannot navigate an outlet before a primary route is active.');
    const auxiliary = this.#auxiliaryRoutes.find((route) => route.name === target.name && route.outlet === outlet);
    if (!auxiliary) throw new Error(`Unknown auxiliary route ${target.name} for outlet ${outlet}`);
    const segments = Object.entries(this.current.outlets)
      .filter(([name]) => name !== outlet)
      .map(([, match]) => match.route.serialize(match.params));
    segments.push(auxiliary.serialize(target.params));
    const href = AuxiliaryRoute.composeUrlPath(this.current.path, segments) + this.current.url.search + this.current.url.hash;
    return this.#go(href, replace, options);
  }

  #go(target: RouteTarget, replace: boolean, options: NavigationOptions): RouteContext | null {
    const nextUrl = new URL(this.url(target), window.location.href);
    const matched = this.match(nextUrl);
    const navigation = options.navigation ?? matched?.definition.navigation ?? 'spa';
    if (navigation === 'reload') {
      if (replace) window.location.replace(nextUrl.href); else window.location.assign(nextUrl.href);
      return matched;
    }
    if (!matched) {
      this.#reportNotFound(nextUrl);
      return null;
    }
    if (replace) history.replaceState({}, '', nextUrl); else history.pushState({}, '', nextUrl);
    return this.#commit(nextUrl);
  }

  #commit(url: URL): RouteContext | null {
    const next = this.match(url);
    if (!next) {
      this.#reportNotFound(url);
      return null;
    }
    const previousRoute = this.current;
    this.current = next;
    this.dispatchEvent(new RouteChangeEvent({ route: next, previousRoute, initial: previousRoute === null, changed: getRouteChangeSet(previousRoute, next) }));
    return next;
  }

  #reportNotFound(url: URL): void {
    console.error(`<router-content>: Route not found: ${url.pathname}${url.search}${url.hash}`);
    const detail = { router: this, url };
    this.dispatchEvent(new RouteNotFoundEvent(detail));
    window.dispatchEvent(new RouteNotFoundEvent(detail));
  }

  #stripBasePath(pathname: string): string | null {
    if (this.basePath === '/') return pathname;
    const mount = this.basePath.slice(0, -1);
    if (pathname === mount || pathname === this.basePath) return '/';
    if (!pathname.startsWith(this.basePath)) return null;
    return `/${pathname.slice(this.basePath.length)}`;
  }

  #withBasePath(path: string): string {
    if (this.basePath === '/' || !path.startsWith('/')) return path;
    const suffixIndex = path.search(/[?#]/);
    const pathname = suffixIndex === -1 ? path : path.slice(0, suffixIndex);
    const suffix = suffixIndex === -1 ? '' : path.slice(suffixIndex);
    const mount = this.basePath.slice(0, -1);
    if (pathname === mount || pathname.startsWith(this.basePath)) return path;
    return pathname === '/' ? `${this.basePath}${suffix}` : `${mount}${pathname}${suffix}`;
  }

  #onPopState = () => { this.#commit(new URL(window.location.href)); };
  #onClick = (event: MouseEvent) => {
    const target = event.composedPath().find((node) => node instanceof HTMLAnchorElement && node.hasAttribute('href'));
    if (!(target instanceof HTMLAnchorElement)) return;

    const configuredHref = target.getAttribute('href')!;
    let url = new URL(target.href, window.location.href);
    if (configuredHref.startsWith('/') && !configuredHref.startsWith('//')) {
      const prefixedUrl = new URL(this.url(configuredHref), window.location.href);
      if (this.match(prefixedUrl)) {
        url = prefixedUrl;
        target.setAttribute('href', prefixedUrl.pathname + prefixedUrl.search + prefixedUrl.hash);
      }
    }

    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.target || target.hasAttribute('download') || target.hasAttribute('data-router-ignore')) return;
    if (url.origin !== window.location.origin || !this.match(url)) return;
    event.preventDefault();
    this.navigate(url.pathname + url.search + url.hash, { navigation: target.hasAttribute('data-router-reload') ? 'reload' : undefined });
  };
}
