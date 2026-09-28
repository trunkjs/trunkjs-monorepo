import type { LitElement } from 'lit';
import { ProLitTemplate } from './ProLitTemplate';
import { defineReactiveScope, type ScopeState, type ReactiveScope } from '@trunkjs/scope';

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
  $on?: { [event: string]: (...args: any[]) => any };
  $ref?: { [name: string]: HTMLElement | null };
  $tpl?: ProLitTemplate | string;
  $this?: LitElement;
  $update?: () => void;
  $raw?: object & ScopeDefinition;
  $rawPure?: object & ScopeDefinition;
}
export interface ProlitScope extends ScopeState {
  $tpl: ProLitTemplate;
  $update(): void;
}
export interface ProlitAware {
  contentScope?: ProlitScope;
}
export type Scope<T extends object> = Omit<ReactiveScope<T>, '$tpl' | '$raw' | '$rawPure'> &
  ProlitScope & {
    readonly $raw: Omit<T, '$tpl'> & { $tpl?: ProLitTemplate };
    readonly $rawPure: { [K in keyof T as K extends `$${string}` ? never : K]: T[K] };
  };
const prolitScopes = new WeakSet<object>();

/** Runtime identity check: plain data objects and fabricated type assertions are not scopes. */
export function isProlitScope(value: unknown): value is ProlitScope {
  return value !== null && typeof value === 'object' && prolitScopes.has(value);
}

/** Instance-local state and callbacks. Mount with prolit(scope); declaration never starts a read.
 * @example const scope = scopeDefine({ name: 'Ada', $tpl: prolit_html`<p>{{ name }}</p>` });
 */
export function scopeDefine<T extends object & ScopeDefinition>(definition: T): Scope<T> {
  if (isProlitScope(definition)) return definition as Scope<T>;
  const scope = defineReactiveScope(definition, {
    transform(key, value, proxy) {
      if (key !== '$tpl' || value === undefined) return value;
      if (typeof value === 'string') value = new ProLitTemplate(value);
      if (!(value instanceof ProLitTemplate)) throw new TypeError('$tpl must be a string or ProLitTemplate.');
      return value.bindScope(proxy);
    },
    read(key, value) {
      if (key === '$tpl' && !value) throw new Error('Template is not defined. Define $tpl before rendering.');
      return value;
    },
    detachedUpdate: () => definition.$this?.requestUpdate(),
  });
  prolitScopes.add(scope);
  return scope as unknown as Scope<T>;
}
