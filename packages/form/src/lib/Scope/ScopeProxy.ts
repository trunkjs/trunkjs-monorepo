import { ScopeArray } from './ScopeArray';
import { ScopeValue } from './ScopeValue';
import type { ScopeDefinition, ScopeShape, ScopeValueDefinition } from './scope-types';

export class ScopeProxy<ScopeDef extends ScopeDefinition> {
  protected readonly values: Partial<ScopeShape<ScopeDef>> = {};

  public constructor(protected readonly scopeDefinition: ScopeDef) {
    for (const [key, value] of Object.entries(scopeDefinition) as Array<
      [keyof ScopeDef & string, ScopeDef[keyof ScopeDef & string]]
    >) {
      this.set(key, value);
    }

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }

        return target.get(prop as keyof ScopeDef & string);
      },
      set: (target, prop, value, receiver) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.set(target, prop, value, receiver);
        }

        target.set(prop as keyof ScopeDef & string, value as ScopeDef[keyof ScopeDef & string]);
        return true;
      },
      has: (target, prop) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.has(target, prop);
        }

        return prop in target.values;
      },
      ownKeys: (target) => {
        return [...new Set([...Reflect.ownKeys(target), ...Object.keys(target.values)])];
      },
      getOwnPropertyDescriptor: (target, prop) => {
        if (typeof prop === 'string' && prop in target.values) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: target.values[prop as keyof ScopeDef & string],
          };
        }

        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    }) as this;
  }

  public get<TKey extends keyof ScopeDef>(key: TKey): ScopeValue<ScopeDef[TKey], ScopeDef> {
    if (!this.values[key]) {
      this.defineValue(key, this.scopeDefinition[key]);
    }

    return this.values[key];
  }

  public set<TKey extends keyof ScopeDef & string>(
    key: TKey,
    value: ScopeDef[TKey] | ScopeShape<ScopeDef>[TKey],
  ): this {
    const normalizedValue = this.normalizeValue(key, value);

    if (normalizedValue instanceof ScopeValue) {
      normalizedValue.connectParent(this);
    }

    this.values[key] = normalizedValue;
    return this;
  }

  private defineValue<TKey extends keyof ScopeDef & string>(key: TKey, value: ScopeDef[TKey]): void {
    this.set(key, value);
  }

  private normalizeValue<TKey extends keyof ScopeDef & string>(
    key: TKey,
    value: ScopeDef[TKey] | ScopeShape<ScopeDef>[TKey],
  ): ScopeShape<ScopeDef>[TKey] {
    if (value instanceof ScopeValue || value instanceof ScopeArray || value instanceof ScopeProxy) {
      return value as ScopeShape<ScopeDef>[TKey];
    }

    if (isScopeValueDefinition(value)) {
      return new ScopeValue(key, value) as ScopeShape<ScopeDef>[TKey];
    }

    if (isScopeDefinition(value)) {
      return new ScopeProxy(value) as ScopeShape<ScopeDef>[TKey];
    }

    return new ScopeValue(key, { defaultValue: value }) as ScopeShape<ScopeDef>[TKey];
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isScopeValueDefinition(value: unknown): value is ScopeValueDefinition {
  if (!isObject(value) || value instanceof ScopeArray || value instanceof ScopeProxy || value instanceof ScopeValue) {
    return false;
  }

  return (
    'defaultValue' in value ||
    'on' in value ||
    'onset' in value ||
    'oninput' in value ||
    'onchange' in value ||
    'onclick' in value
  );
}

function isScopeDefinition(value: unknown): value is ScopeDefinition {
  return isObject(value) && !isScopeValueDefinition(value);
}
