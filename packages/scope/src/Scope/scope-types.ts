import { createRuntimeEntry } from './scope-runtime';

/**
 * Laufzeit-Shape eines einzelnen gebundenen Values inklusive DOM-Bezug.
 *
 * Wichtig z. B. wenn ein Event-Handler sowohl den aktuellen Wert als auch
 * den umgebenden Scope kennen muss.
 *
 * Beispiel:
 * ```ts
 * onclick(value) {
 *   value.$scope.wurst.$value = 'Bratwurst';
 * }
 * ```
 */
export type TScopeMetaFactory<TValue = unknown, TScopeRef = unknown> = (value: TValue, scope: TScopeRef) => unknown;

export type TScopeMetaDefinition<TValue = unknown, TScopeRef = unknown> =
  | Record<string, unknown>
  | TScopeMetaFactory<TValue, TScopeRef>;

export type TScopeMetaSnapshot<TValue = unknown, TMeta = unknown> = {
  meta: TMeta;
  value: TValue;
};

type TValueDefinitionKey = '$meta' | 'defaultValue' | 'on' | 'onset' | 'oninput' | 'onchange' | 'onclick' | 'onenter';

type TIsValueDefinitionLike<T> = T extends object
  ? Exclude<keyof T, TValueDefinitionKey> extends never
    ? true
    : false
  : false;

export type TBoundScopeValue<
  VD extends TValueDefinition<any, any, any>,
  SD extends TScopeDefinition = TScopeDefinition,
  RootSD extends TScopeDefinition = SD,
> = {
  $value: TInferValueType<VD>;
  $meta: TScopeMetaSnapshot<TInferValueType<VD>>;

  $$: TValueDefinition<any, SD, TInferValueType<VD>, RootSD>;
  $scope: TScope<SD, RootSD>;
  $root: TScope<RootSD, RootSD>;
};

export type TScopeObjectValue<SD extends TScopeDefinition = TScopeDefinition> = {
  [K in keyof SD as K extends '$meta' ? never : K]: SD[K] extends TArrayDefinition<infer Item>
    ? TScopeArrayValue<Item>
    : TIsValueDefinitionLike<SD[K]> extends true
      ? SD[K] extends TValueDefinition<any, any, infer V>
        ? V
        : never
      : SD[K] extends TScopeDefinition<any>
        ? TScopeObjectValue<SD[K]>
        : never;
};

export type TScopeArrayValue<Item extends TScopeDefinition = TScopeDefinition> = Array<TScopeObjectValue<Item>>;

/**
 * Laufzeit-Container für Array-Einträge eines Scopes.
 *
 * Der Zugriff ist absichtlich wie auf ein Array typisiert: per `[index]`,
 * `at()`, `first()`, `last()` oder Iterator.
 *
 * Zusätzlich liefert `$value` alle Array-Werte rekursiv als plain Array.
 *
 * Beispiel:
 * ```ts
 * $scope.mitarbeiter[0].name.$value = 'Max';
 * $scope.mitarbeiter.first().name.$value = 'Erster';
 * $scope.mitarbeiter.$value;
 * ```
 */
export type TScopeArray<
  Item extends TScopeDefinition = TScopeDefinition,
  SD extends TScopeDefinition = TScopeDefinition,
  RootSD extends TScopeDefinition = SD,
> = {
  $$: TArrayDefinition<Item>;
  $scope: TScope<SD, RootSD>;
  $root: TScope<RootSD, RootSD>;
  $value: TScopeArrayValue<Item>;
  $meta: TScopeMetaSnapshot<TScopeArrayValue<Item>>;
  length: number;
  at(index: number): TScope<Item, RootSD>;
  first(): TScope<Item, RootSD>;
  last(): TScope<Item, RootSD>;
  [index: number]: TScope<Item, RootSD>;
  [Symbol.iterator](): IterableIterator<TScope<Item, RootSD>>;
};

/**
 * Laufzeit-Container eines Scopes.
 *
 * Aus der Definition `SD` werden hier echte Properties erzeugt:
 * - Value-Definitionen -> `TScopeValue`
 * - Scope-Definitionen -> `TScope`
 * - Array-Definitionen -> `TScopeArray`
 *
 * Wichtig für typsicheren Zugriff wie:
 * ```ts
 * $scope.arbeitgeber.name.$value
 * $scope.firma.name.$$.onclick
 * $scope.$value
 * ```
 */
export type TScope<SD extends TScopeDefinition = TScopeDefinition, RootSD extends TScopeDefinition = SD> = {
  $$: TScopeRuntimeDefinition<SD, RootSD>;
  $root: TScope<RootSD, RootSD>;
  $value: TScopeObjectValue<SD>;
  $meta: TScopeMetaSnapshot<TScopeObjectValue<SD>>;
  withValue<K extends string, ND extends TValueDefinition<any, any, any>>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, ND>, RootSD>;
  with<K extends string, ND extends TValueDefinition<any, any, any>>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, ND>, RootSD>;
  withScope<K extends string, ND extends TScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, ND>, RootSD>;
  withArray<K extends string, ND extends TScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, TArrayDefinition<ND>>, RootSD>;
} & {
  [K in keyof SD as K extends '$meta' ? never : K]: SD[K] extends TArrayDefinition<infer Item>
    ? TScopeArray<Item, SD, RootSD>
    : TIsValueDefinitionLike<SD[K]> extends true
      ? SD[K] extends TValueDefinition<any, any, any>
        ? TScopeValue<SD[K], SD, RootSD>
        : never
      : SD[K] extends TScopeDefinition<any>
        ? TScope<SD[K], RootSD>
        : never;
};

/**
 * Laufzeit-Container eines einzelnen Value-Keys innerhalb eines Scopes.
 *
 * Im Unterschied zu `TBoundScopeValue` ist das hier der Container, den man
 * direkt über den Scope erreicht, also z. B. `$scope.wurst`.
 *
 * Beispiel:
 * ```ts
 * $scope.wurst.$value = 'lecker';
 * $scope.wurst.$$.onclick = value => console.log(value.$value);
 * ```
 */
export type TScopeValue<
  TV extends TValueDefinition<any, any, any>,
  SD extends TScopeDefinition = TScopeDefinition,
  RootSD extends TScopeDefinition = SD,
> = {
  name: string;
  $value: TInferValueType<TV>;
  $meta: TScopeMetaSnapshot<TInferValueType<TV>>;
  element: HTMLElement;
  $scope: TScope<SD, RootSD>;
  $root: TScope<RootSD, RootSD>;
  $$: TValueDefinition<any, SD, TInferValueType<TV>, RootSD>;
};

/**
 * Typ eines Event-Handlers für einen Value.
 *
 * Wichtig, damit innerhalb des Handlers der Value und dessen Scope korrekt
 * typisiert sind.
 *
 * Beispiel:
 * ```ts
 * onclick(value, event) {
 *   console.log(value.$value, value.$scope);
 * }
 * ```
 */
export type TScopeValueListener<TVC extends TScopeValue<any, any, any>> = (value: TVC, event: Event) => void;

export type TScopeValueFactory = <
  TV extends TValueDefinition<any, any, any, any>,
  SD extends TScopeDefinition = TScopeDefinition,
  RootSD extends TScopeDefinition = SD,
>(
  name: string,
  definition: TValueDefinition<any, SD, TInferValueType<TV>, RootSD>,
  scope: TScope<SD, RootSD>,
  root: TScope<RootSD, RootSD>,
) => TScopeValue<TV, SD, RootSD>;

export type TScopeRuntimeOptions = {
  createValue?: TScopeValueFactory;
};

/**
 * Union aller erlaubten Einträge innerhalb einer Scope-Definition.
 *
 * Ein Key darf also entweder ein einfacher Value, ein verschachtelter Scope
 * oder ein Array von Scopes sein.
 *
 * Beispiel:
 * ```ts
 * {
 *   name: { defaultValue: 'Max' },
 *   firma: { ort: { defaultValue: 'Berlin' } },
 *   mitarbeiter: defineArray({ name: { defaultValue: 'A' } }),
 * }
 * ```
 */
export type TScopeEntryDefinition =
  | TValueDefinition<any, any, any>
  | TScopeDefinition
  | TArrayDefinition<TScopeDefinition>;

/**
 * Extrahiert den eigentlichen Value-Typ aus einer `TValueDefinition`.
 *
 * Wichtig, damit `defaultValue: 'Max'` nicht bei `unknown` landet, sondern der
 * Value-Container einen konkreten Typ bekommt.
 *
 * Beispiel:
 * ```ts
 * type V = TInferValueType<TValueDefinition<'name', any, string>>; // string
 * ```
 */
export type TInferValueType<TV extends TValueDefinition<any, any, any>> =
  TV extends TValueDefinition<any, any, infer V> ? V : never;

/**
 * Erlaubt nur neue Keys, die im Scope noch nicht existieren.
 *
 * Wichtig für `scope.withValue/withScope/withArray`, damit diese den
 * Scope-Typ nur erweitern und nicht stillschweigend bestehende Keys
 * überschreiben.
 *
 * Beispiel:
 * ```ts
 * $scope.withValue('neu', { defaultValue: 1 }); // ok
 * // $scope.withValue('wurst', { defaultValue: 1 }); // nicht erlaubt
 * ```
 */
export type TNewScopeKey<SD extends TScopeDefinition, K extends string> = K extends keyof SD ? never : K;

/**
 * Erweitert eine bestehende Scope-Definition um genau einen neuen Key.
 *
 * Dieser Hilfstyp ist die Basis dafür, dass nach `scope.withValue(...)` der
 * neue Key direkt auf dem selben Scope sichtbar wird.
 *
 * Beispiel:
 * ```ts
 * type Next = TExtendScopeDefinition<{ a: { defaultValue: 1 } }, 'b', { defaultValue: 2 }>;
 * ```
 */
export type TExtendScopeDefinition<
  SD extends TScopeDefinition,
  K extends string,
  ND extends TScopeEntryDefinition,
> = SD & Record<K, ND>;

/**
 * Mappt einen Definition-Eintrag auf seinen Laufzeit-Container-Typ.
 *
 * Wichtig in `createScope(...)`, damit aus einer Definition automatisch der
 * passende Runtime-Typ entsteht.
 *
 * Beispiel:
 * ```ts
 * // Value-Definition -> TScopeValue
 * // Scope-Definition -> TScope
 * // Array-Definition -> TScopeArray
 * ```
 */
export type TScopeEntry<
  ND extends TScopeEntryDefinition,
  RootSD extends TScopeDefinition = ND extends TScopeDefinition ? ND : TScopeDefinition,
> =
  ND extends TArrayDefinition<infer Item>
    ? TScopeArray<Item, TScopeDefinition, RootSD>
    : TIsValueDefinitionLike<ND> extends true
      ? ND extends TValueDefinition<any, any, any>
        ? TScopeValue<ND, TScopeDefinition, RootSD>
        : never
      : ND extends TScopeDefinition
        ? TScope<ND, RootSD>
        : never;

// =========== DEFINITION TYPES ===========

/**
 * Definition eines einzelnen Value-Keys im Scope.
 *
 * Hier wird beschrieben, welchen Default-Wert ein Key hat und welche Handler
 * daran hängen. Aus dieser Definition wird später ein `TScopeValue`.
 *
 * Beispiel:
 * ```ts
 * name: {
 *   defaultValue: 'Max',
 *   onclick: value => console.log(value.$value),
 * }
 * ```
 */
export type TValueDefinition<
  P extends string = string,
  SD extends TScopeDefinition = TScopeDefinition,
  V = unknown,
  RootSD extends TScopeDefinition = SD,
> = {
  defaultValue?: V;
  $meta?: TScopeMetaDefinition<V, TScope<SD, RootSD>>;
  on?: Partial<Record<string, TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V, RootSD>, SD, RootSD>>>>;
  onset?: TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V, RootSD>, SD, RootSD>>;
  oninput?: TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V, RootSD>, SD, RootSD>>;
  onchange?: TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V, RootSD>, SD, RootSD>>;
  onclick?: TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V, RootSD>, SD, RootSD>>;
  onenter?: TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V, RootSD>, SD, RootSD>>;
};

/**
 * Reine Definitionsform eines Scopes.
 *
 * Ein Scope besteht aus Keys, die jeweils ein Value, ein Child-Scope oder ein
 * Array sein können.
 *
 * Beispiel:
 * ```ts
 * {
 *   name: { defaultValue: 'Max' },
 *   firma: { ort: { defaultValue: 'Berlin' } },
 * }
 * ```
 */
export type TScopeDefinition<K extends string = string> = {
  [P in Exclude<K, '$meta'>]:
    | TValueDefinition<P, TScopeDefinition>
    | TScopeDefinition
    | TArrayDefinition<TScopeDefinition>;
} & {
  $meta?: TScopeMetaDefinition<any, any>;
};

/**
 * Reine Definitionsform eines Arrays innerhalb eines Scopes.
 *
 * `item` beschreibt die Struktur jedes Array-Elements.
 *
 * Beispiel:
 * ```ts
 * defineArray({
 *   name: { defaultValue: 'Max' },
 * })
 * ```
 */
export type TArrayDefinition<T extends TScopeDefinition> = {
  __type: 'array';
  item: T;
  $meta?: TScopeMetaDefinition<any, any>;
};

/**
 * Normalisierte Runtime-Definition eines Scopes.
 *
 * Vor allem wichtig für `$$`, damit verschachtelte Keys und Value-Typen auch
 * dort korrekt sichtbar sind.
 *
 * Beispiel:
 * ```ts
 * $scope.firma.name.$$.onclick = value => console.log(value.$value)
 * ```
 */
export type TScopeRuntimeDefinition<SD extends TScopeDefinition, RootSD extends TScopeDefinition = SD> = {
  [K in keyof SD as K extends '$meta' ? never : K]: SD[K] extends TArrayDefinition<infer Item>
    ? TArrayDefinition<Item>
    : TIsValueDefinitionLike<SD[K]> extends true
      ? SD[K] extends TValueDefinition<any, any, infer V>
        ? TValueDefinition<Extract<K, string>, SD, V, RootSD>
        : never
      : SD[K] extends TScopeDefinition<any>
        ? TScopeRuntimeDefinition<SD[K], RootSD>
        : never;
} & {
  $meta?: TScopeMetaDefinition<any, any>;
};

// ============= API FUNCTIONS =============

export function defineScope<SD extends TScopeDefinition>(definition: SD): SD {
  return definition;
}

export function defineArray<SD extends TScopeDefinition>(definition: SD): TArrayDefinition<SD> {
  return {
    __type: 'array',
    item: definition as SD,
  };
}

export function createScope<SD extends TScopeEntryDefinition>(
  definition: SD,
  options?: TScopeRuntimeOptions,
): TScopeEntry<SD> {
  return createRuntimeEntry(definition, undefined, undefined, 'value', options) as TScopeEntry<SD>;
}
