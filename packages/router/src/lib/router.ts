import { AuxiliaryRoute, type AuxiliaryRouteMatch, type AuxiliaryRouteParams } from './auxiliary-route';
import { buildPath, compilePath, getRouteChangeSet, normalizeRoute, queryString } from './route-tools';

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

/** A dirty check is independent of the editor or confirmation UI that supplies it. */
export interface DirtyNavigation {
  readonly from: RouteContext | null;
  readonly to: RouteContext;
  readonly source: 'navigate' | 'replace' | 'popstate';
}
export type DirtyCheck = (navigation: DirtyNavigation) => boolean;
export type DirtyConfirmation = (navigation: DirtyNavigation) => boolean | Promise<boolean>;

const HISTORY_INDEX = '__trunkjsRouterIndex';
const defaultDirtyConfirmation: DirtyConfirmation = () =>
  window.confirm('You have unsaved changes. Leave this page?');
export interface AuxiliaryRouteTarget { name: string; params?: AuxiliaryRouteParams; }

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

/** A view or editor plugin reports whether the current route has unsaved work. */
export class RouteDirtyEvent extends CustomEvent<boolean> {
  static readonly type = 'routedirty';
  constructor(dirty: boolean) {
    super(RouteDirtyEvent.type, { detail: dirty, bubbles: true, composed: true });
  }
}

/** Route registration does not navigate. See ../../examples/01-start.ts. */
export class Router extends EventTarget {
  readonly #routes: NormalizedRouteDefinition[] = [];
  readonly #auxiliaryRoutes: AuxiliaryRoute[] = [];
  #started = false;
  #dirtyChecks = new Set<{ isDirty: DirtyCheck; confirm: DirtyConfirmation }>();
  #routeDirty = false;
  #dirtyConfirmation: DirtyConfirmation = defaultDirtyConfirmation;
  #navigationId = 0;
  #historyIndex = 0;
  #restoringIndex: number | null = null;
  current: RouteContext | null = null;

  constructor(routes: Array<RouteDefinition | CustomElementConstructor> = [], auxiliaryRoutes: AuxiliaryRoute[] = []) {
    super();
    routes.forEach((entry) => typeof entry === 'function' ? this.register(entry) : this.addRoute(entry));
    auxiliaryRoutes.forEach((route) => this.addAuxiliaryRoute(route));
  }

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
    this.#historyIndex = this.#readHistoryIndex() ?? 0;
    this.#writeHistoryIndex(this.#historyIndex, true);
    window.addEventListener('popstate', this.#onPopState);
    document.addEventListener('click', this.#onClick);
    document.addEventListener(RouteDirtyEvent.type, this.#onRouteDirty);
    this.#commit(new URL(window.location.href));
  }

  stop(): void {
    if (!this.#started) return;
    this.#started = false;
    window.removeEventListener('popstate', this.#onPopState);
    document.removeEventListener('click', this.#onClick);
    document.removeEventListener(RouteDirtyEvent.type, this.#onRouteDirty);
    this.#routeDirty = false;
  }

  /** Set the confirmation used for the event-driven dirty state. */
  setDirtyConfirmation(confirm: DirtyConfirmation): void {
    this.#dirtyConfirmation = confirm;
  }

  /** Register a view-local dirty check. Dispose it when the view disconnects.
   * An optional confirmation can show any UI, including an asynchronous dialog.
   */
  addDirtyCheck(isDirty: DirtyCheck, confirm: DirtyConfirmation = defaultDirtyConfirmation): () => void {
    const entry = { isDirty, confirm };
    this.#dirtyChecks.add(entry);
    return () => { this.#dirtyChecks.delete(entry); };
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
    const parsed = AuxiliaryRoute.parseUrlPath(url.pathname);
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
    if (typeof target === 'string') return target;
    const path = 'name' in target
      ? buildPath(this.#routes.find((route) => route.name === target.name)?.path ?? (() => { throw new Error(`Unknown route: ${target.name}`); })(), target.params, target.name)
      : target.path;
    return `${path}${queryString(target.query)}${target.hash ? `#${target.hash.replace(/^#/, '')}` : ''}`;
  }

  navigate(target: RouteTarget, options: NavigationOptions = {}): Promise<RouteContext | null> { return this.#go(target, false, options); }
  replace(target: RouteTarget, options: NavigationOptions = {}): Promise<RouteContext | null> { return this.#go(target, true, options); }

  navigateOutlet(outlet: string, target: AuxiliaryRouteTarget, options: NavigationOptions = {}): Promise<RouteContext | null> {
    return this.#navigateOutlet(outlet, target, false, options);
  }

  replaceOutlet(outlet: string, target: AuxiliaryRouteTarget, options: NavigationOptions = {}): Promise<RouteContext | null> {
    return this.#navigateOutlet(outlet, target, true, options);
  }

  clearOutlet(outlet: string, options: NavigationOptions = {}): Promise<RouteContext | null> {
    if (!this.current) throw new Error('Cannot clear an outlet before a primary route is active.');
    const segments = Object.entries(this.current.outlets)
      .filter(([name]) => name !== outlet)
      .map(([, match]) => match.route.serialize(match.params));
    return this.#go(AuxiliaryRoute.composeUrlPath(this.current.path, segments) + this.current.url.search + this.current.url.hash, false, options);
  }

  back(): void { history.back(); }
  forward(): void { history.forward(); }

  #navigateOutlet(outlet: string, target: AuxiliaryRouteTarget, replace: boolean, options: NavigationOptions): Promise<RouteContext | null> {
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

  async #go(target: RouteTarget, replace: boolean, options: NavigationOptions): Promise<RouteContext | null> {
    const nextUrl = new URL(this.url(target), window.location.href);
    const matched = this.match(nextUrl);
    const navigation = options.navigation ?? matched?.definition.navigation ?? 'spa';
    if (!matched && navigation !== 'reload') return null;
    const id = ++this.#navigationId;
    if ((this.#routeDirty || this.#dirtyChecks.size) && matched && nextUrl.href !== this.current?.url.href &&
      !(await this.#allowNavigation({ from: this.current, to: matched, source: replace ? 'replace' : 'navigate' })))
      return null;
    if (id !== this.#navigationId) return null;
    if (navigation === 'reload') {
      if (replace) window.location.replace(nextUrl.href); else window.location.assign(nextUrl.href);
      return matched;
    }
    this.#writeHistoryIndex(replace ? this.#historyIndex : ++this.#historyIndex, replace, nextUrl);
    return this.#commit(nextUrl);
  }

  async #allowNavigation(navigation: DirtyNavigation): Promise<boolean> {
    if (this.#routeDirty && !(await this.#dirtyConfirmation(navigation))) return false;
    for (const entry of [...this.#dirtyChecks]) {
      if (!this.#dirtyChecks.has(entry) || !entry.isDirty(navigation)) continue;
      if (!(await entry.confirm(navigation))) return false;
    }
    return true;
  }

  #readHistoryIndex(): number | null {
    const index = history.state?.[HISTORY_INDEX];
    return typeof index === 'number' && Number.isSafeInteger(index) ? index : null;
  }

  #writeHistoryIndex(index: number, replace: boolean, url?: URL): void {
    const state: Record<string, unknown> = history.state && typeof history.state === 'object' ? { ...history.state } : {};
    state[HISTORY_INDEX] = index;
    if (replace) history.replaceState(state, '', url ?? window.location.href);
    else history.pushState(state, '', url);
  }

  #commit(url: URL): RouteContext | null {
    const next = this.match(url);
    if (!next) return null;
    const previousRoute = this.current;
    if (previousRoute?.url.href !== next.url.href) this.#routeDirty = false;
    this.current = next;
    this.dispatchEvent(new RouteChangeEvent({ route: next, previousRoute, initial: previousRoute === null, changed: getRouteChangeSet(previousRoute, next) }));
    return next;
  }

  #onPopState = () => { void this.#handlePopState(); };
  async #handlePopState(): Promise<void> {
    const index = this.#readHistoryIndex();
    if (this.#restoringIndex !== null && index === this.#restoringIndex) {
      this.#restoringIndex = null;
      return;
    }
    if (this.#restoringIndex !== null) this.#restoringIndex = null;
    const next = this.match(new URL(window.location.href));
    if (!next) return;
    const id = ++this.#navigationId;
    try {
      if ((this.#routeDirty || this.#dirtyChecks.size) && next.url.href !== this.current?.url.href &&
        !(await this.#allowNavigation({ from: this.current, to: next, source: 'popstate' }))) {
        if (id === this.#navigationId) this.#restoreHistory(index);
        return;
      }
      if (id !== this.#navigationId) return;
      this.#historyIndex = index ?? this.#historyIndex;
      this.#commit(next.url);
    } catch (error) {
      if (id === this.#navigationId) this.#restoreHistory(index);
      console.error('Navigation guard failed', error);
    }
  }

  #restoreHistory(index: number | null): void {
    if (index !== null && index !== this.#historyIndex) {
      this.#restoringIndex = this.#historyIndex;
      history.go(this.#historyIndex - index);
    } else {
      // Foreign history entries have no router index; keep the visible URL in sync.
      this.#writeHistoryIndex(this.#historyIndex, true, this.current?.url);
    }
  }
  #onRouteDirty = (event: Event) => {
    const dirty = (event as CustomEvent<unknown>).detail;
    if (typeof dirty === 'boolean') this.#routeDirty = dirty;
  };
  #onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.composedPath().find((node) => node instanceof HTMLAnchorElement && node.hasAttribute('href'));
    if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute('download') || target.hasAttribute('data-router-ignore')) return;
    const url = new URL(target.href, window.location.href);
    if (url.origin !== window.location.origin || !this.match(url)) return;
    event.preventDefault();
    void this.navigate(url.pathname + url.search + url.hash, { navigation: target.hasAttribute('data-router-reload') ? 'reload' : undefined }).catch(console.error);
  };
}
