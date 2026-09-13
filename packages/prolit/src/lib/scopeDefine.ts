import type { LitElement } from 'lit';
import { ProLitTemplate } from './ProLitTemplate';
import { bindOperation, getRuntime, notify, registerScope } from './scope-runtime';

/** Legacy open definition for dynamic HTML scopes. scopeDefine preserves exact inferred keys. */
export interface ScopeDefinition {
  [key: string]: any;
  $fn?: { [name: string]: (...args: any[]) => any };
  $hooks?: {
    $connect?: () => void | (() => void);
    /** @deprecated Legacy hook declarations; only $connect has a runtime lifecycle. */
    $init?: () => void;
    $beforeRender?: () => void;
    $afterRender?: () => void;
    $onceBeforeRender?: () => void;
    $onceAfterRender?: () => void;
  };
  $on?: { [event: string]: (event: Event) => void };
  $ref?: { [name: string]: HTMLElement | null };
  $tpl?: ProLitTemplate | string;
  $this?: LitElement;
  $update?: () => void;
  $raw?: object & ScopeDefinition;
  $rawPure?: object & ScopeDefinition;
}
declare const scopeBrand: unique symbol;
export interface ProlitScope {
  readonly [scopeBrand]: true;
  $tpl: ProLitTemplate;
  $update(): void;
}
export interface ProlitAware {
  contentScope?: ProlitScope;
}
export type Scope<T extends object> = Omit<T, '$tpl' | '$update' | '$raw' | '$rawPure'> &
  ProlitScope & {
    readonly $raw: Omit<T, '$tpl'> & { $tpl?: ProLitTemplate };
    readonly $rawPure: { [K in keyof T as K extends `$${string}` ? never : K]: T[K] };
  };
/** Runtime identity check: plain data objects and fabricated type assertions are not scopes. */
export function isProlitScope(value: unknown): value is ProlitScope {
  return getRuntime(value) !== undefined;
}

/** Instance-local state and callbacks. Mount with prolit(scope); declaration never starts a read.
 * @example const scope = scopeDefine({ name: 'Ada', $tpl: prolit_html`<p>{{ name }}</p>` });
 */
export function scopeDefine<T extends object & ScopeDefinition>(definition: T): Scope<T> {
  if (isProlitScope(definition)) return definition as Scope<T>;
  const bindTemplate = (value: unknown): ProLitTemplate => {
    if (typeof value === 'string') value = new ProLitTemplate(value);
    if (!(value instanceof ProLitTemplate)) throw new TypeError('$tpl must be a string or ProLitTemplate.');
    return value.bindScope(proxy);
  };
  const bindValue = (key: PropertyKey, value: unknown) => {
    bindOperation(value, runtime);
    if (key === '$fn' && value && typeof value === 'object') {
      for (const fn of Object.values(value)) bindOperation(fn, runtime);
    }
  };
  const proxy = new Proxy(definition, {
    has(target, key) {
      return ['$update', '$raw', '$rawPure'].includes(String(key)) || Reflect.has(target, key);
    },
    get(target, key, receiver) {
      if (key === '$update') return () => notify(runtime);
      if (key === '$raw') return target;
      if (key === '$rawPure') return Object.fromEntries(Object.entries(target).filter(([key]) => !key.startsWith('$')));
      if (key === '$tpl' && !target.$tpl) throw new Error('Template is not defined. Define $tpl before rendering.');
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value) {
      if (key === '$tpl') value = bindTemplate(value);
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
  }) as unknown as Scope<T>;
  const runtime = registerScope(proxy);
  runtime.connect = () => definition.$hooks?.$connect?.();
  // Compatibility only: a directive-mounted scope never requests an outer host update.
  runtime.legacyUpdate = () => definition.$this?.requestUpdate();
  for (const [key, value] of Object.entries(definition)) bindValue(key, value);
  if (definition.$tpl !== undefined) definition.$tpl = bindTemplate(definition.$tpl);
  return proxy;
}
