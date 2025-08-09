---
slugName: container-string-tokens-buildparameters-parent
includeFiles:
    - ./src/lib/Container/Container.ts
    - ./src/lib/Container/decorator.ts
    - ./src/lib/Container/get-arg-names.ts
    - ./src/lib/DiraApp.ts
editFiles:
    - ./src/lib/Container/Container.ts
    - ./src/lib/Container/decorator.ts
    - ./src/lib/DiraApp.ts
original_prompt: Implementiere Container buildParameters and refactor the Container
    to be used with string Tokens. Also resolve dependencies in factories by using buildParameters.
    Detect circular dependencies and throw an Error. if useClass resolve the constructors
    arguments and properties decorated with decorator. remove the deps and scrope from
    ClassProvider and FactoryProvider. Add a setParentContainer to connect a parent
    container to try to resolve dependencies that are noch registered within itself.
    Also check with parentContainer if names are double assigned and throw error
---

# Prepare Container: string tokens, buildParameters, parent container, decorators

We will refactor the DI Container to use string tokens, implement buildParameters, resolve factory dependencies via parameter names, detect circular dependencies, support property injection via @Inject decorator, remove deps/scope from provider types, and add parent-container support with duplicate-name checks.

## Assumptions

- Tokens are case-sensitive strings. The token helper token('NAME') is just identity returning the given string.
- All providers are singleton by default. Because scope was removed from provider types, there is no transient scope in this change.
- Factory providers are synchronous. If async factories are required, we can extend useFactory to allow returning Promise and adjust resolve to await it.
- Constructor argument injection is by parameter names using buildParameters, not reflect-metadata types.
- Property injection is by @Inject decorator; if no token specified, the property name is used as token.
- Parent-child containers: When a token is not registered in the current container, it will be looked up in the parent. Duplicates across parent-child are not allowed and will throw on setParentContainer and register.

Example tokens:

- "logger" resolves whatever was registered under token "logger".
- @Inject('config') on a property injects the "config" token.

If you need different token naming conventions (e.g., kebab/snake/camel normalization) or async factories, please clarify.

## Tasks

- Refactor to string tokens Replace symbol-based tokens with string tokens across Container and decorators.
- Implement buildParameters Resolve argument names to tokens; allow overrides via parameter name.
- Resolve factory dependencies Use buildParameters to inject args into factory functions.
- Circular dependency detection Detect cycles across nested (parent-child) container resolution chains.
- Constructor and property injection Resolve constructor args and inject @Inject-decorated properties.
- Remove deps and scope from providers Providers no longer accept deps or scope; default singleton behavior.
- Add setParentContainer Add parent container; resolve missing tokens via parent; check duplicate names.
- Fix DiraApp import Ensure DiraApp extends Container with proper import.

## Overview: File changes

- ./src/lib/Container/Container.ts Major refactor: string tokens, buildParameters, property injection, parent container, cycle detection, provider type updates.
- ./src/lib/Container/decorator.ts Implement @Inject and exported metadata reader for property injection.
- ./src/lib/DiraApp.ts Add missing import for Container and export DiraApp correctly.

## Detail changes

### ./src/lib/Container/Container.ts

Referenced Tasks

- Refactor to string tokens Use strings instead of symbols.
- Implement buildParameters Build args by parameter names and resolve via tokens.
- Resolve factory dependencies Use buildParameters for factory functions.
- Circular dependency detection Implement chain-aware detection including parent delegation.
- Constructor and property injection Resolve constructor args and @Inject properties.
- Remove deps and scope from providers Simplify provider types and resolution.
- Add setParentContainer Parent delegation and duplicate name checks.

Replace entire file content by

```
/**
 * Dependency Injection Container using string tokens and parameter-name based resolution.
 */
import { getArgNames } from './get-arg-names';
import { getInjectedProperties } from './decorator';

export type Token<T = any> = string;
export const token = <T = any>(name: string) => name as Token<T>;

type Ctor<T> = new (...args: any[]) => T;

type ClassProvider<T> = {
  useClass: Ctor<T>;
};

type FactoryProvider<T> = {
  // args are resolved by buildParameters from parameter names
  useFactory: (...args: any[]) => T;
};

type ValueProvider<T> = {
  useValue: T;
};

type Provider<T> = ClassProvider<T> | FactoryProvider<T> | ValueProvider<T>;

export class UnresolvableException extends Error {
  constructor(token: Token<any>, chain: Token<any>[]) {
    const chainStr = [...chain, token].join(' -> ');
    super(`Unresolvable dependency: "${token}" in chain: ${chainStr}`);
    this.name = 'UnresolvableException';
  }
}

export class Container {
  private providers = new Map<Token<any>, Provider<any>>();
  private singletons = new Map<Token<any>, any>();
  private parent?: Container;

  /**
   * Register a provider for a token. Tokens must be unique within the container and its parent.
   * @throws Error if token already registered in this container or in the parent container chain.
   */
  register<T>(tok: Token<T>, provider: Provider<T>) {
    if (this.providers.has(tok)) {
      throw new Error(`Token "${tok}" already registered in this container.`);
    }
    if (this.parent?.hasToken(tok)) {
      throw new Error(
        `Token "${tok}" already registered in parent container. Duplicate registrations across parent-child are not allowed.`
      );
    }
    this.providers.set(tok, provider);
    return this;
  }

  /**
   * Set a parent container. Duplicates across containers are not allowed.
   * @throws Error if any token in this container already exists in the parent chain.
   */
  setParentContainer(parent: Container) {
    // Check duplicates against parent (and its ancestors)
    for (const tok of this.providers.keys()) {
      if (parent.hasToken(tok)) {
        throw new Error(
          `Cannot set parent: Token "${tok}" exists in parent container chain.`
        );
      }
    }
    this.parent = parent;
    return this;
  }

  /**
   * Check if token exists in this container or any parent container.
   */
  hasToken(tok: Token<any>): boolean {
    if (this.providers.has(tok)) return true;
    return this.parent ? this.parent.hasToken(tok) : false;
    }

  /**
   * Resolve an instance by token.
   * Always returns singleton instances (providers are singleton by default).
   * @throws UnresolvableException | Error on missing provider or circular dependency.
   */
  resolve<T>(tok: Token<T>): T {
    return this.resolveToken(tok, []);
  }

  /**
   * Internal resolution with cycle tracking across parent chain.
   */
  private resolveToken<T>(tok: Token<T>, chain: Token<any>[]): T {
    // return cached singleton
    if (this.singletons.has(tok)) {
      return this.singletons.get(tok);
    }

    // circular detection (across chain)
    if (chain.includes(tok)) {
      const chainStr = [...chain, tok].join(' -> ');
      throw new Error(`Circular dependency detected: ${chainStr}`);
    }
    chain.push(tok);

    const p = this.providers.get(tok);
    if (!p) {
      // delegate to parent if possible
      if (this.parent) {
        const res = this.parent.resolveToken(tok, chain);
        chain.pop();
        return res;
      }
      chain.pop();
      throw new UnresolvableException(tok, chain);
    }

    let instance: T;

    if ('useValue' in p) {
      instance = p.useValue;
    } else if ('useFactory' in p) {
      const args = this.buildParameters(p.useFactory);
      instance = p.useFactory(...args);
    } else if ('useClass' in p) {
      const args = this.buildParameters(p.useClass);
      instance = new p.useClass(...args);
      // Inject @Inject-decorated properties
      this.injectDecoratedProperties(instance);
    } else {
      chain.pop();
      throw new Error('Invalid provider');
    }

    // Cache singleton instance
    this.singletons.set(tok, instance);

    chain.pop();
    return instance;
  }

  /**
   * Builds parameters for a function based on its parameter names.
   * Each parameter name is treated as a token and resolved via the container,
   * unless an override is provided in overrideParams.
   *
   * Example:
   *   function factory(logger, config) { ... }
   *   container.buildParameters(factory) // -> [resolve('logger'), resolve('config')]
   *
   * @param fn Function or constructor to inspect
   * @param overrideParams Map of parameter-name -> value which overrides resolution
   */
  buildParameters(fn: Function, overrideParams: Record<string, any> = {}): any[] {
    const names = getArgNames(fn);
    return names.map((name) =>
      Object.prototype.hasOwnProperty.call(overrideParams, name)
        ? overrideParams[name]
        : this.resolve(name)
    );
  }

  /**
   * Inject all properties decorated with @Inject on the instance.
   * If no token was provided on the decorator, the property name is used as token.
   */
  private injectDecoratedProperties(instance: any): void {
    const meta = getInjectedProperties(instance);
    for (const [prop, tok] of meta.entries()) {
      instance[prop] = this.resolve(tok);
    }
  }

  /**
   * Create a child container that delegates to this container as parent.
   * No provider copying; registrations stay isolated in the child.
   */
  createChild(): Container {
    const c = new Container();
    c.setParentContainer(this);
    return c;
  }
}
```

### ./src/lib/Container/decorator.ts

Referenced Tasks

- Constructor and property injection Implement @Inject to collect metadata for properties.
- Refactor to string tokens Token remains imported; behavior adjusted for strings.

Replace entire file content by

```
import type { Token } from './Container';

const INJECTED_PROPS = new WeakMap<object, Map<string, string>>();

/**
 * Decorator to inject a dependency into a class property.
 * If no token is given, the property name is used as token.
 *
 * Example:
 *   class Service {
 *     @Inject('logger') private log!: Logger;
 *     @Inject() private config!: Config; // token 'config'
 *   }
 */
export function Inject(token?: Token<any>) {
  // property decorator
  return function (target: any, propertyKey: string) {
    const proto = target;
    let map = INJECTED_PROPS.get(proto);
    if (!map) {
      map = new Map<string, string>();
      INJECTED_PROPS.set(proto, map);
    }
    map.set(propertyKey, token ?? propertyKey);
  };
}

/**
 * Returns a map of propertyName -> token for an instance based on its prototype chain.
 * Properties defined lower in the prototype chain take precedence.
 */
export function getInjectedProperties(instance: any): Map<string, string> {
  const result = new Map<string, string>();
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    const current = INJECTED_PROPS.get(proto);
    if (current) {
      for (const [prop, tok] of current.entries()) {
        if (!result.has(prop)) {
          result.set(prop, tok);
        }
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return result;
}
```

### ./src/lib/DiraApp.ts

Referenced Tasks

- Fix DiraApp import Ensure it properly extends Container.

Replace entire file content by

```
import { Container } from './Container/Container';

export class DiraApp extends Container {

}
```

## Missing Information

- Do you need async factory support (useFactory returning Promise)? If yes, we will make resolve and buildParameters async and update call sites.
- Should duplicate token registration within the same container be allowed to override? We currently throw to avoid accidental overrides.

## Example prompts to clarify further

- We need async factories. Please update Container.resolve/buildParameters to support async providers and document the contract.
- Allow transient providers. Please add an optional scope flag ("singleton" | "transient") on register and adapt caching accordingly.
- Normalize token casing. Ensure parameter names loggerService map to token "logger-service" using a given naming strategy.
