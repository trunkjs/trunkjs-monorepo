import { scopeResource, type ScopeResource, type ScopeResult } from '@trunkjs/scope';
import { bindOperation, observeActivation, registerOperation, type ScopeRuntime } from '@trunkjs/scope/runtime';
import type { RouteChange, RouteContext } from '@trunkjs/router';

export type RouteResourceKey = string | number | boolean | readonly (string | number | boolean)[];
export interface RouteResource<T> extends Pick<ScopeResource<T>, 'data' | 'pending' | 'error'> {
  reload(): Promise<ScopeResult<T>>;
}

/** A Router-aware Prolit host. Route events arrive before or after scope activation. */
export interface RouteResourceHost {
  readonly route: RouteContext | null;
  observeRoute(listener: (change: RouteChange) => void): () => void;
  requestUpdate(): unknown;
}

function equalKey(a: RouteResourceKey | null, b: RouteResourceKey | null): boolean {
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((part, index) => Object.is(part, b[index]));
  return Object.is(a, b);
}

function selectKey<K extends RouteResourceKey>(value: K | null | undefined): K | null {
  if (value == null) return null;
  const parts = Array.isArray(value) ? value : [value];
  if (parts.some((part) => part == null || !['string', 'number', 'boolean'].includes(typeof part)))
    throw new TypeError('routeResource key must be a primitive or a flat tuple of primitives.');
  return (Array.isArray(value) ? [...value] : value) as K;
}

/** Load only while the owning Prolit scope is mounted; one read per key and activation.
 * @example
 * user: routeResource(this, {
 *   key: route => route.params['id'],
 *   load: ({ signal }, id) => api.user(id, { signal }),
 *   errorMessage: 'User could not be loaded.',
 * })
 * @see scopeResource, RouteResourceHost
 */
export function routeResource<T, K extends RouteResourceKey>(
  host: RouteResourceHost,
  options: {
    key: (route: RouteContext) => K | null | undefined;
    load: (context: { signal: AbortSignal }, key: K) => Promise<T>;
    errorMessage: string;
  },
): RouteResource<T> {
  const inner = scopeResource<T, [K]>({
    load: options.load,
    errorMessage: options.errorMessage,
    retainData: false,
  });
  let key: K | null = null;
  let runtime: ScopeRuntime | undefined;
  let active = false;

  const onRoute = (change: RouteChange): void => {
    const next = selectKey(options.key(change.route));
    const changed = !equalKey(key, next);
    key = next;
    if (active && changed) {
      if (key === null) inner.reset();
      else void inner.reload(key);
    }
    // A tab or hash can change the view without changing the resource identity.
    host.requestUpdate();
  };
  host.observeRoute(onRoute);

  const resource: RouteResource<T> = {
    get data() { return inner.data; },
    get pending() { return inner.pending; },
    get error() { return inner.error; },
    reload() {
      if (key === null || !active)
        return Promise.resolve({ status: 'cancelled', reason: 'disconnected' });
      return inner.reload(key);
    },
  };
  registerOperation(resource, (owner) => {
    if (runtime && runtime !== owner) throw new Error('Create a separate routeResource for each scope.');
    if (runtime) return;
    runtime = owner;
    bindOperation(inner, owner);
    observeActivation(owner, (connected) => {
      active = connected;
      if (connected && key !== null) void inner.reload(key);
      if (!connected) inner.reset();
    });
  });
  return resource;
}
