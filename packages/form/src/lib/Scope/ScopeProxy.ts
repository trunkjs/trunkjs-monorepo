import { ScopeValue } from './ScopeValue';
import { ScopeDefinition } from './scope-types';

export class ScopeProxy<T extends ScopeDefinition> {
  protected readonly values: Record<string, ScopeValue> = {};

  public constructor(private scopeDefinition: T) {
    for (const [key, value] of Object.entries(scopeDefinition)) {
      this.set(key, value);
    }

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }

        return target.get(prop);
      },
      set: (target, prop, value, receiver) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.set(target, prop, value, receiver);
        }

        target.set(prop, value);
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
            value: target.values[prop],
          };
        }

        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    }) as this;
  }

  public get(key: string): ScopeValue {
    if (!(key in this.values)) {
      this.values[key] = new ScopeValue(key);
    }

    return this.values[key];
  }

  public set(key: string, value: ScopeValue | unknown): this {
    this.values[key] = value instanceof ScopeValue ? value : new ScopeValue(key, value);
    return this;
  }
}
