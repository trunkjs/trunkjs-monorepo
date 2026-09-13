import type {
  TArrayDefinition,
  TInferValueType,
  TScope,
  TScopeArrayValue,
  TScopeDefinition,
  TScopeEntry,
  TScopeEntryDefinition,
  TScopeMetaDefinition,
  TScopeMetaSnapshot,
  TScopeObjectValue,
  TScopeRuntimeDefinition,
  TScopeRuntimeOptions,
  TValueDefinition,
} from './scope-types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const META_KEY = '$meta';
const VALUE_DEFINITION_KEYS = new Set([
  META_KEY,
  'defaultValue',
  'on',
  'onset',
  'oninput',
  'onchange',
  'onclick',
  'onenter',
]);

function isArrayDefinition(value: unknown): value is TArrayDefinition<TScopeDefinition> {
  return isObject(value) && value['__type'] === 'array' && isObject(value['item']);
}

function isValueDefinition(value: unknown): value is TValueDefinition<any, any, any, any> {
  if (!isObject(value) || isArrayDefinition(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => VALUE_DEFINITION_KEYS.has(key));
}

function getScopeDefinitionKeys(definition: Record<string, unknown>): string[] {
  return Object.keys(definition).filter((key) => key !== META_KEY);
}

function hasScopeDefinitionKey(definition: Record<string, unknown>, key: string): boolean {
  return key !== META_KEY && key in definition;
}

function resolveMetaDefinition<TValue, TScopeRef>(
  definitionMeta: TScopeMetaDefinition<TValue, TScopeRef> | undefined,
  value: TValue,
  scope: TScopeRef,
): unknown {
  if (typeof definitionMeta === 'function') {
    return definitionMeta(value, scope);
  }

  return definitionMeta ?? {};
}

function createFallbackElement(): HTMLElement {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    return document.createElement('div');
  }

  return {
    getAttribute: () => null,
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
  } as unknown as HTMLElement;
}

function bindClassValue<T extends object, K extends keyof T>(target: T, prop: K): T[K] {
  const value = Reflect.get(target, prop, target) as T[K];
  return typeof value === 'function' ? (value as Function).bind(target) : value;
}

export class ScopeValueRuntime<
  TV extends TValueDefinition<any, any, any, any>,
  SD extends TScopeDefinition = TScopeDefinition,
  RootSD extends TScopeDefinition = SD,
> {
  #value: TInferValueType<TV>;
  #element: HTMLElement = createFallbackElement();

  public constructor(
    public readonly name: string,
    private readonly definition: TValueDefinition<any, SD, TInferValueType<TV>, RootSD>,
    private readonly scope: TScope<SD, RootSD>,
    private readonly root: TScope<RootSD, RootSD>,
  ) {
    this.#value = definition.defaultValue as TInferValueType<TV>;
  }

  public get $value(): TInferValueType<TV> {
    return this.#value;
  }

  public set $value(value: TInferValueType<TV>) {
    this.#value = value;
  }

  public get $meta(): TScopeMetaSnapshot<TInferValueType<TV>> {
    return {
      meta: resolveMetaDefinition(this.definition.$meta, this.#value, this.scope),
      value: this.#value,
    };
  }

  public get element(): HTMLElement {
    return this.#element;
  }

  public set element(element: HTMLElement) {
    this.#element = element;
  }

  public get $scope(): TScope<SD, RootSD> {
    return this.scope;
  }

  public get $root(): TScope<RootSD, RootSD> {
    return this.root;
  }

  public get $$(): TValueDefinition<any, SD, TInferValueType<TV>, RootSD> {
    return this.definition;
  }
}

export class ScopeArrayRuntime<
  Item extends TScopeDefinition = TScopeDefinition,
  SD extends TScopeDefinition = TScopeDefinition,
  RootSD extends TScopeDefinition = SD,
> {
  private readonly options?: TScopeRuntimeOptions;
  readonly #items: Array<TScope<Item, RootSD>> = [];

  public constructor(
    private readonly definition: TArrayDefinition<Item>,
    private readonly scope: TScope<SD, RootSD>,
    private readonly root: TScope<RootSD, RootSD>,
    options?: TScopeRuntimeOptions,
  ) {
    this.options = options;
    return new Proxy(this, {
      get: (target, prop) => {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return target.at(Number(prop));
        }

        return bindClassValue(target, prop as keyof typeof target);
      },
      has: (target, prop) => {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          return Number(prop) < target.#items.length;
        }

        return Reflect.has(target, prop);
      },
      ownKeys: (target) => {
        return [...new Set([...Reflect.ownKeys(target), ...target.#items.map((_, index) => String(index))])];
      },
      getOwnPropertyDescriptor: (target, prop) => {
        if (typeof prop === 'string' && /^\d+$/.test(prop)) {
          const index = Number(prop);
          if (index >= target.#items.length) {
            return undefined;
          }

          return {
            configurable: true,
            enumerable: true,
            writable: false,
            value: target.at(index),
          };
        }

        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    }) as this;
  }

  public get $$(): TArrayDefinition<Item> {
    return this.definition;
  }

  public get $scope(): TScope<SD, RootSD> {
    return this.scope;
  }

  public get $root(): TScope<RootSD, RootSD> {
    return this.root;
  }

  public get $value(): TScopeArrayValue<Item> {
    return this.#items.map((item) => item.$value) as TScopeArrayValue<Item>;
  }

  public get $meta(): TScopeMetaSnapshot<TScopeArrayValue<Item>> {
    const value = this.$value;

    return {
      meta: {
        $self: resolveMetaDefinition(this.definition.$meta, value, this.scope),
        items: this.#items.map((item) => item.$meta),
      },
      value,
    };
  }

  public get length(): number {
    return this.#items.length;
  }

  public at(index: number): TScope<Item, RootSD> {
    if (!Number.isInteger(index) || index < 0) {
      throw new Error(`Invalid scope array index: ${index}`);
    }

    this.#items[index] ??= new ScopeProxyRuntime<Item, RootSD>(
      this.definition.item as unknown as TScopeRuntimeDefinition<Item, RootSD>,
      this.root,
      this.options,
    ) as TScope<Item, RootSD>;
    return this.#items[index];
  }

  public first(): TScope<Item, RootSD> {
    return this.at(0);
  }

  public last(): TScope<Item, RootSD> {
    return this.at(this.#items.length === 0 ? 0 : this.#items.length - 1);
  }

  public [Symbol.iterator](): IterableIterator<TScope<Item, RootSD>> {
    return this.#items[Symbol.iterator]();
  }
}

export class ScopeProxyRuntime<SD extends TScopeDefinition = TScopeDefinition, RootSD extends TScopeDefinition = SD> {
  private readonly options?: TScopeRuntimeOptions;
  readonly #entries: Partial<Record<keyof SD & string, TScopeEntry<TScopeEntryDefinition, RootSD>>> = {};

  #root!: TScope<RootSD, RootSD>;
  #self!: TScope<SD, RootSD>;
  private readonly definition: TScopeRuntimeDefinition<SD, RootSD>;

  public constructor(
    definition: TScopeRuntimeDefinition<SD, RootSD>,
    root?: TScope<RootSD, RootSD>,
    options?: TScopeRuntimeOptions,
  ) {
    this.definition = definition;
    this.options = options;
    const proxy = new Proxy(this, {
      get: (target, prop) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return bindClassValue(target, prop as keyof typeof target);
        }

        if (!hasScopeDefinitionKey(target.definition as Record<string, unknown>, prop)) {
          return undefined;
        }

        return target.getEntry(prop as keyof SD & string);
      },
      set: (target, prop, value, receiver) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.set(target, prop, value, receiver);
        }

        target.setEntry(prop as keyof SD & string, value as TScopeEntry<TScopeEntryDefinition, RootSD>);
        return true;
      },
      has: (target, prop) => {
        if (typeof prop !== 'string' || Reflect.has(target, prop)) {
          return Reflect.has(target, prop);
        }

        return hasScopeDefinitionKey(target.definition as Record<string, unknown>, prop);
      },
      ownKeys: (target) => {
        return getScopeDefinitionKeys(target.definition as Record<string, unknown>);
      },
      getOwnPropertyDescriptor: (target, prop) => {
        if (typeof prop === 'string' && hasScopeDefinitionKey(target.definition as Record<string, unknown>, prop)) {
          return {
            configurable: true,
            enumerable: true,
            writable: true,
            value: target.getEntry(prop as keyof SD & string),
          };
        }

        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
    }) as TScope<SD, RootSD>;

    this.#self = proxy;
    this.#root = root ?? (proxy as unknown as TScope<RootSD, RootSD>);

    return proxy as this;
  }

  public get $$(): TScopeRuntimeDefinition<SD, RootSD> {
    return this.definition;
  }

  public get $root(): TScope<RootSD, RootSD> {
    return this.#root;
  }

  public get $value(): TScopeObjectValue<SD> {
    const result: Record<string, unknown> = {};

    for (const key of getScopeDefinitionKeys(this.definition as Record<string, unknown>)) {
      const entry = this.getEntry(key as keyof SD & string);
      result[key] = entry.$value;
    }

    return result as TScopeObjectValue<SD>;
  }

  public get $meta(): TScopeMetaSnapshot<TScopeObjectValue<SD>> {
    const value: Record<string, unknown> = {};
    const meta: Record<string, unknown> = {};

    for (const key of getScopeDefinitionKeys(this.definition as Record<string, unknown>)) {
      const entry = this.getEntry(key as keyof SD & string);
      value[key] = entry.$value;
      meta[key] = entry.$meta;
    }

    meta['$self'] = resolveMetaDefinition(this.definition.$meta, value as TScopeObjectValue<SD>, this.#self);

    return {
      meta,
      value: value as TScopeObjectValue<SD>,
    };
  }

  public withValue<K extends string, ND extends TValueDefinition<any, any, any>>(key: K, definition: ND): void {
    this.define(key, definition);
  }

  public with<K extends string, ND extends TValueDefinition<any, any, any>>(key: K, definition: ND): void {
    this.withValue(key, definition);
  }

  public withScope<K extends string, ND extends TScopeDefinition>(key: K, definition: ND): void {
    this.define(key, definition);
  }

  public withArray<K extends string, ND extends TScopeDefinition>(key: K, definition: ND): void {
    this.define(key, {
      __type: 'array',
      item: definition,
    } as TArrayDefinition<ND>);
  }

  public define<K extends string>(key: K, definition: TScopeEntryDefinition): void {
    if (key === META_KEY) {
      throw new Error(`The key ${META_KEY} is reserved for metadata.`);
    }

    (this.definition as Record<string, TScopeEntryDefinition>)[key] = definition;
    this.#entries[key as keyof SD & string] = createRuntimeEntry(
      definition,
      this.#self as unknown as TScope<any, RootSD>,
      this.#root,
      key,
      this.options,
    ) as TScopeEntry<TScopeEntryDefinition, RootSD>;
  }

  private getEntry(key: keyof SD & string): TScopeEntry<TScopeEntryDefinition, RootSD> {
    this.#entries[key] ??= createRuntimeEntry(
      (this.definition as Record<string, TScopeEntryDefinition>)[key],
      this.#self as unknown as TScope<any, RootSD>,
      this.#root,
      key,
      this.options,
    ) as TScopeEntry<TScopeEntryDefinition, RootSD>;

    return this.#entries[key] as TScopeEntry<TScopeEntryDefinition, RootSD>;
  }

  private setEntry(key: keyof SD & string, value: TScopeEntry<TScopeEntryDefinition, RootSD>): void {
    this.#entries[key] = value;
  }
}

function createDetachedRootScope(options?: TScopeRuntimeOptions): TScope<TScopeDefinition, TScopeDefinition> {
  return new ScopeProxyRuntime(
    {} as TScopeRuntimeDefinition<TScopeDefinition, TScopeDefinition>,
    undefined,
    options,
  ) as unknown as TScope<TScopeDefinition, TScopeDefinition>;
}

export function createRuntimeEntry<
  ND extends TScopeEntryDefinition,
  RootSD extends TScopeDefinition = ND extends TScopeDefinition ? ND : TScopeDefinition,
>(
  definition: ND,
  scope?: TScope<any, RootSD>,
  root?: TScope<RootSD, RootSD>,
  key = 'value',
  options?: TScopeRuntimeOptions,
): TScopeEntry<ND, RootSD> {
  if (isArrayDefinition(definition)) {
    const detachedRoot = (root ?? createDetachedRootScope(options)) as TScope<RootSD, RootSD>;
    const parentScope = (scope ?? detachedRoot) as TScope<any, RootSD>;

    return new ScopeArrayRuntime(
      definition,
      parentScope as any,
      detachedRoot as any,
      options,
    ) as unknown as TScopeEntry<ND, RootSD>;
  }

  if (isValueDefinition(definition)) {
    const detachedRoot = (root ?? createDetachedRootScope(options)) as TScope<RootSD, RootSD>;
    const parentScope = (scope ?? detachedRoot) as TScope<any, RootSD>;

    if (options?.createValue) {
      return (options.createValue as any)(key, definition, parentScope, detachedRoot) as TScopeEntry<ND, RootSD>;
    }

    return new ScopeValueRuntime(key, definition, parentScope as any, detachedRoot as any) as unknown as TScopeEntry<
      ND,
      RootSD
    >;
  }

  return new ScopeProxyRuntime(
    definition as TScopeRuntimeDefinition<any, RootSD>,
    root as any,
    options,
  ) as unknown as TScopeEntry<ND, RootSD>;
}

export function isScopeProxyRuntime(value: unknown): value is ScopeProxyRuntime<any, any> {
  return value instanceof ScopeProxyRuntime;
}
