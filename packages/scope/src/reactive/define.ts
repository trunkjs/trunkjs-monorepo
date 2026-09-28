import { bindOperation, getRuntime, notify, registerScope } from './runtime';

declare const scopeBrand: unique symbol;
/** Common renderer-independent scope contract. */
export interface ScopeState {
  readonly [scopeBrand]: true;
  $update(): void;
}
export interface ReactiveScopeDefinition {
  $hooks?: { $connect?: () => void | (() => void) };
  $fn?: Record<string, (...args: any[]) => any>;
  $on?: Record<string, (...args: any[]) => any>;
}
export type ReactiveScope<T extends object> = Omit<T, '$update' | '$raw' | '$rawPure' | '$emit'> & ScopeState & {
  readonly $raw: T;
  readonly $rawPure: { [K in keyof T as K extends `$${string}` ? never : K]: T[K] };
  $emit<K extends keyof NonNullable<T extends { $on?: infer E } ? E : never> & string>(
    event: K,
    ...args: NonNullable<T extends { $on?: infer E } ? E : never>[K] extends (...args: infer A) => any ? A : never
  ): void;
};
/** Adapter hooks transform renderer-owned fields without importing a renderer into Scope. */
export interface ScopeAdapter {
  transform?(key: PropertyKey, value: unknown, scope: object): unknown;
  read?(key: PropertyKey, value: unknown): unknown;
  detachedUpdate?(): void;
}
export function isScope(value: unknown): value is ScopeState {
  return getRuntime(value) !== undefined;
}
/** Create instance-local direct-access state. Activation is controlled by the consumer. */
export function defineReactiveScope<T extends object>(
  definition: T & ReactiveScopeDefinition,
  adapter: ScopeAdapter = {},
): ReactiveScope<T> {
  const bindValue = (key: PropertyKey, value: unknown) => {
    bindOperation(value, runtime);
    if ((key === '$fn' || key === '$on') && value && typeof value === 'object') {
      for (const callback of Object.values(value)) bindOperation(callback, runtime);
    }
  };
  const proxy = new Proxy(definition, {
    has(target, key) {
      return ['$update', '$raw', '$rawPure', '$emit'].includes(String(key)) || Reflect.has(target, key);
    },
    get(target, key, receiver) {
      if (key === '$update') return () => notify(runtime);
      if (key === '$raw') return target;
      if (key === '$rawPure') return Object.fromEntries(Object.entries(target).filter(([name]) => !name.startsWith('$')));
      if (key === '$emit') return (event: string, ...args: unknown[]) => definition.$on?.[event]?.apply(proxy, args);
      const value = Reflect.get(target, key, receiver);
      return adapter.read ? adapter.read(key, value) : value;
    },
    set(target, key, value) {
      if (adapter.transform) value = adapter.transform(key, value, proxy);
      bindValue(key, value);
      const changed = !Object.is(Reflect.get(target, key), value);
      const result = Reflect.set(target, key, value);
      if (result && changed) notify(runtime);
      return result;
    },
    deleteProperty(target, key) {
      const had = Reflect.has(target, key);
      const result = Reflect.deleteProperty(target, key);
      if (result && had) notify(runtime);
      return result;
    },
  }) as unknown as ReactiveScope<T>;
  const runtime = registerScope(proxy);
  runtime.connect = () => definition.$hooks?.$connect?.();
  runtime.legacyUpdate = adapter.detachedUpdate;
  for (const [key, initial] of Object.entries(definition)) {
    const value = adapter.transform ? adapter.transform(key, initial, proxy) : initial;
    Reflect.set(definition, key, value);
    bindValue(key, value);
  }
  return proxy;
}
