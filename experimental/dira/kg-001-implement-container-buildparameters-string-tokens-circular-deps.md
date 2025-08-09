---
slugName: implement-container-buildparameters-string-tokens-circular-deps
includeFiles:
    - ./src/lib/Container/Container.ts
    - ./src/lib/Container/get-arg-names.ts
    - ./src/lib/DiraApp.ts
editFiles:
    - ./src/lib/Container/Container.ts
    - ./src/lib/DiraApp.ts
original_prompt: Implementiere Container buildParameters and refactor the Container
    to be used with string Tokens. Also resolve dependencies in factories by using buildParameters.
    Detect circular dependencies and throw an Error.
---

# Prepare Implement Container buildParameters and refactor to string Tokens

Implement buildParameters in the DI Container, refactor the Container to use string tokens, resolve factory dependencies via buildParameters, and ensure circular dependencies are detected and throw an Error.

## Assumptions

- Tokens will be string-based identifiers (e.g., "logger", "config"). A helper token<T>(name: string) will simply return the provided name to keep usage consistent.
- Factory providers will no longer receive the Container instance as the first argument. Instead, their argument names will be treated as tokens and resolved via buildParameters. This is a breaking change from the previous useFactory: (c: Container) => T signature. If access to the Container is required by a factory, the caller must register a provider for a token, e.g., "container", and pass it via override parameters or register it as a value provider. This keeps responsibilities clear and predictable.
- Class providers keep using explicit deps. We will not auto-infer constructor dependencies for classes unless deps is provided. If desired, auto-wiring can be added later using getArgNames on class constructors.
- Circular dependencies should be detected and result in an Error. The current mechanism exists; we’ll keep/improve it, and align error details using UnresolvableException where appropriate.
- If a parameter name in buildParameters has no matching provider and is not overridden, an UnresolvableException is thrown.
- We will fix the missing import in DiraApp to correctly extend Container (compilation fix directly related to using Container).

If you prefer that factories still receive the container as the first argument, we can keep that behavior and append resolved dependencies, but the request explicitly asks to resolve dependencies in factories by using buildParameters, so we will not pass the container implicitly.

## Missing Information

- Should class providers also auto-resolve dependencies by constructor parameter names if deps is omitted? We will not implement this unless requested.

## Tasks

- implement-buildparameters Implement buildParameters to resolve dependencies by parameter names and support overrides.
- refactor-to-string-tokens Switch Token typing to string, and adjust providers and error handling accordingly.
- resolve-factory-deps Use buildParameters to resolve factory dependencies from parameter names and pass them to the factory function.
- circular-dep-detection Ensure circular dependency detection remains functional and throws an Error with a clear chain.
- fix-diraapp-import Fix DiraApp to import and extend Container correctly.

## Overview: File changes

- ./src/lib/Container/Container.ts Implement buildParameters, refactor to string tokens, update provider types, update factory resolution, and refine errors.
- ./src/lib/DiraApp.ts Fix import of Container and re-export with proper extension.

## Detail changes

### ./src/lib/Container/Container.ts

Referenced Tasks

- implement-buildparameters Implement core logic based on argument names with overrides
- refactor-to-string-tokens Replace symbol tokens with strings
- resolve-factory-deps Use buildParameters for factory providers
- circular-dep-detection Keep/strengthen detection and error messages

Replace entire file content by

```
/* di.ts */
import { getArgNames } from './get-arg-names';

type Scope = 'singleton' | 'transient';

export type Token<T = any> = string;
export const token = <T = any>(name: string) => name as Token<T>;

type Ctor<T> = new (...args: any[]) => T;

type ClassProvider<T> = {
  useClass: Ctor<T>;
  deps?: Token<any>[];
  scope?: Scope;
};

type FactoryProvider<T> = {
  // Factory deps are inferred from argument names via buildParameters
  useFactory: (...args: any[]) => T;
  scope?: Scope;
};

type ValueProvider<T> = { useValue: T };

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
  private resolving: Token<any>[] = [];

  register<T>(tok: Token<T>, provider: Provider<T>) {
    this.providers.set(tok, provider);
    return this;
  }

  resolve<T>(tok: Token<T>): T {
    // cached singleton?
    if (this.singletons.has(tok)) return this.singletons.get(tok);

    // circular detection
    if (this.resolving.includes(tok)) {
      const chain = [...this.resolving, tok].join(' -> ');
      throw new Error(`Circular dependency detected: ${chain}`);
    }
    this.resolving.push(tok);

    const p = this.providers.get(tok);
    if (!p) {
      this.resolving.pop();
      throw new UnresolvableException(tok, this.resolving);
    }

    let instance: T;

    if ('useValue' in p) {
      instance = p.useValue;
    } else if ('useFactory' in p) {
      const args = this.buildParameters(p.useFactory);
      instance = p.useFactory(...args);
    } else if ('useClass' in p) {
      const deps = (p.deps ?? []).map((d) => this.resolve(d));
      instance = new p.useClass(...deps);
    } else {
      this.resolving.pop();
      throw new Error('Invalid provider');
    }

    const scope: Scope = 'scope' in p && p.scope ? p.scope : 'singleton';
    if (scope === 'singleton') this.singletons.set(tok, instance);

    this.resolving.pop();
    return instance;
  }

  /**
   * Builds parameters for a function based on its parameter names.
   * - Each parameter name is treated as a DI token and resolved via this.resolve(name).
   * - overrideParams takes precedence over resolved values.
   *
   * Example:
   *   // tokens registered for "config" and "logger"
   *   const args = container.buildParameters((config, logger) => {});
   *   // args[0] = resolve("config"), args[1] = resolve("logger")
   *
   * @param fn The factory/function whose arguments should be resolved
   * @param overrideParams Optional map of parameter-name -> value to override resolution
   * @returns Ordered array of arguments to pass to fn
   */
  buildParameters(fn: Function, overrideParams: Record<string, any> = {}): any[] {
    const names = getArgNames(fn);

    return names.map((name) => {
      if (Object.prototype.hasOwnProperty.call(overrideParams, name)) {
        return overrideParams[name];
      }
      // Try to resolve by parameter name as token
      return this.resolve(name as Token<any>);
    });
  }

  // optional: override/child scope
  createChild(): Container {
    const c = new Container();
    c.providers = new Map(this.providers);
    return c;
  }
}
```

### ./src/lib/DiraApp.ts

Referenced Tasks

- fix-diraapp-import Ensure DiraApp correctly extends Container after refactor

Replace entire file content by

```
import { Container } from './Container/Container';

export class DiraApp extends Container {}
```

## Example usage and migration notes

- Registering providers with string tokens:
    - container.register('logger', { useValue: console });
    - container.register('config', { useValue: { port: 3000 } });

- Class provider with explicit deps (unchanged behavior):
    - class Server { constructor(private config: any, private logger: Console) {} }
    - container.register('server', { useClass: Server, deps: ['config', 'logger'] });

- Factory provider auto-resolving arguments by name:
    - container.register('db', {
      useFactory: (config) => createDb(config.db),
      scope: 'singleton',
      });
    - Ensure 'config' is registered.

- Overriding parameters at call-site (for custom invocations of buildParameters):
    - const args = container.buildParameters((config, logger) => {}, { logger: myMockLogger });

- Circular dependencies:
    - If A depends on B and B depends on A, calling resolve('A') or resolve('B') will throw:
      "Circular dependency detected: A -> B -> A"

## Example prompts to improve the original request

- Should class providers without explicit deps be auto-wired using constructor parameter names? If yes, we will implement constructor introspection with getArgNames for classes as well.
- Do you require a reserved token name (e.g., "container") to always resolve to the Container instance? If so, we can implement a built-in resolution rule or auto-register it.
