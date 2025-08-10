/**
 * Dependency Injection Container using string tokens and parameter-name based resolution.
 */
import { getInjectedProperties } from './decorator';
import { getArgNames } from './get-arg-names';

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

export class ContainerProviderRegistry {
  protected providers = new Map<Token<any>, Provider<any>>();
  protected parent?: Container;

  /**
   * Register a provider for a token. Tokens must be unique within the container and its parent.
   * @throws Error if token already registered in this container or in the parent container chain.
   */
  register<T>(tok: Token<T>, provider: Provider<T> | null) {
    if (this.providers.has(tok)) {
      if (provider === null) {
        this.providers.delete(tok);
        return this;
      }
      throw new Error(`Token "${tok}" already registered in this container.`);
    }
    if (this.parent?.hasToken(tok)) {
      throw new Error(
        `Token "${tok}" already registered in parent container. Duplicate registrations across parent-child are not allowed.`,
      );
    }
    this.providers.set(tok, provider!);
    return this;
  }

  /**
   * @example
   *  container.registerClass('logger', Logger);
   * @param tok
   * @param useClass
   */
  registerClass<T>(tok: Token<T>, useClass: Ctor<T>) {
    return this.register(tok, { useClass });
  }

  registerFactory<T>(tok: Token<T>, useFactory: (...args: any[]) => T) {
    return this.register(tok, { useFactory });
  }

  registerValue<T>(tok: Token<T>, useValue: T) {
    return this.register(tok, { useValue });
  }

  /**
   * Set a parent container. Duplicates across containers are not allowed.
   * @throws Error if any token in this container already exists in the parent chain.
   */
  setParentContainer(parent: Container) {
    // Check duplicates against parent (and its ancestors)
    for (const tok of this.providers.keys()) {
      if (parent.hasToken(tok)) {
        throw new Error(`Cannot set parent: Token "${tok}" exists in parent container chain.`);
      }
    }
    this.parent = parent;
    return this;
  }
}

export class Container extends ContainerProviderRegistry {
  private singletons = new Map<Token<any>, any>();

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
        return res as unknown as T;
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
   * Builds parameters for a function based on its parameter names and metadata.
   * - Each parameter name is treated as a token and resolved via the container,
   *   unless an override is provided in overrideParams.
   * - If a parameter is optional (or has a default) and is not registered in DI
   *   and is not overridden, 'undefined' is passed to allow optional/default behavior.
   *
   * Example:
   *   function factory(logger, config = {}) { ... }
   *   container.buildParameters(factory) // -> [resolve('logger'), undefined] if 'config' is not registered
   *
   * @param fn Function or constructor to inspect
   * @param overrideParams Map of parameter-name -> value which overrides resolution
   */
  buildParameters(fn: Function, overrideParams: Record<string, any> = {}): any[] {
    const paramMap = getArgNames(fn); // Record<string, { isOptional: boolean; hasDefault: boolean }>
    const args: any[] = [];

    // Preserve declared order via Object.keys (insertion order)
    for (const name of Object.keys(paramMap)) {
      if (Object.prototype.hasOwnProperty.call(overrideParams, name)) {
        args.push(overrideParams[name]);
        continue;
      }

      const meta = paramMap[name];

      if (this.hasToken(name)) {
        args.push(this.resolve(name));
      } else if (meta.isOptional || meta.hasDefault) {
        // Optional/defaulted parameter missing in DI -> pass undefined
        args.push(undefined);
      } else {
        // Required parameter: trigger resolution to throw the appropriate error
        args.push(this.resolve(name));
      }
    }

    return args;
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
