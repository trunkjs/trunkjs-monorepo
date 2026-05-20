/**
 * Laufzeit-Shape eines einzelnen gebundenen Values inklusive DOM-Bezug.
 *
 * Wichtig z. B. wenn ein Event-Handler sowohl den aktuellen Wert als auch
 * den umgebenden Scope kennen muss.
 *
 * Beispiel:
 * ```ts
 * onclick(value) {
 *   value.$scope.wurst.value = 'Bratwurst';
 * }
 * ```
 */
export type TBoundScopeValue<
  VD extends TValueDefinition<any, any, any>,
  SD extends TScopeDefinition = TScopeDefinition,
> = {
  value: TInferValueType<VD>;

  $def: TValueDefinition<any, SD, TInferValueType<VD>>;
  $scope: TScope<SD>;
};

/**
 * Laufzeit-Container für Array-Einträge eines Scopes.
 *
 * Der Zugriff ist absichtlich wie auf ein Array typisiert: per `[index]`,
 * `at()`, `first()`, `last()` oder Iterator.
 *
 * Beispiel:
 * ```ts
 * $scope.mitarbeiter[0].name.value = 'Max';
 * $scope.mitarbeiter.first().name.value = 'Erster';
 * ```
 */
export type TScopeArray<
  Item extends TScopeDefinition = TScopeDefinition,
  SD extends TScopeDefinition = TScopeDefinition,
> = {
  $def: TArrayDefinition<Item>;
  $scope: TScope<SD>;
  length: number;
  at(index: number): TScope<Item>;
  first(): TScope<Item>;
  last(): TScope<Item>;
  [index: number]: TScope<Item>;
  [Symbol.iterator](): IterableIterator<TScope<Item>>;
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
 * $scope.arbeitgeber.name.value
 * $scope.firma.name.$def.onclick
 * ```
 */
export type TScope<SD extends TScopeDefinition = TScopeDefinition> = {
  $def: TScopeRuntimeDefinition<SD>;
  with<K extends string, ND extends TValueDefinition<any, any, any>>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, ND>>;
  withScope<K extends string, ND extends TScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, ND>>;
  withArray<K extends string, ND extends TScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScope<TExtendScopeDefinition<SD, K, TArrayDefinition<ND>>>;
} & {
  [K in keyof SD]: SD[K] extends TValueDefinition<any, any, any>
    ? TScopeValue<SD[K], SD>
    : SD[K] extends TScopeDefinition<any>
      ? TScope<SD[K]>
      : SD[K] extends TArrayDefinition<infer Item>
        ? TScopeArray<Item, SD>
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
 * $scope.wurst.value = 'lecker';
 * $scope.wurst.$def.onclick = value => console.log(value.value);
 * ```
 */
export type TScopeValue<TV extends TValueDefinition<any, any, any>, SD extends TScopeDefinition = TScopeDefinition> = {
  name: string;
  value: TInferValueType<TV>;
  element: HTMLElement;
  $scope: TScope<SD>;
  $def: TValueDefinition<any, SD, TInferValueType<TV>>;
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
 *   console.log(value.value, value.$scope);
 * }
 * ```
 */
export type TScopeValueListener<TVC extends TScopeValue<any, SD>, SD extends TScopeDefinition = TScopeDefinition> = (
  value: TVC,
  event: Event,
) => void;

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
 * Wichtig für `withValue/withScope/withArray`, damit diese den Scope-Typ nur
 * erweitern und nicht stillschweigend bestehende Keys überschreiben.
 *
 * Beispiel:
 * ```ts
 * withValue($scope, 'neu', { defaultValue: 1 }); // ok
 * // withValue($scope, 'wurst', { defaultValue: 1 }); // nicht erlaubt
 * ```
 */
export type TNewScopeKey<SD extends TScopeDefinition, K extends string> = K extends keyof SD ? never : K;

/**
 * Erweitert eine bestehende Scope-Definition um genau einen neuen Key.
 *
 * Dieser Hilfstyp ist die Basis dafür, dass nach `withValue(...)` der neue Key
 * direkt auf dem selben Scope sichtbar wird.
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
export type TScopeEntry<ND extends TScopeEntryDefinition> =
  ND extends TValueDefinition<any, any, any>
    ? TScopeValue<ND>
    : ND extends TScopeDefinition
      ? TScope<ND>
      : ND extends TArrayDefinition<infer Item>
        ? TScopeArray<Item>
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
 *   onclick: value => console.log(value.value),
 * }
 * ```
 */
export type TValueDefinition<P extends string = string, SD extends TScopeDefinition = TScopeDefinition, V = unknown> = {
  defaultValue?: V;
  onclick?: TScopeValueListener<TScopeValue<TValueDefinition<P, SD, V>, SD>, SD>;
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
  [P in K]: TValueDefinition<P, TScopeDefinition> | TScopeDefinition | TArrayDefinition<TScopeDefinition>;
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
};

/**
 * Normalisierte Runtime-Definition eines Scopes.
 *
 * Vor allem wichtig für `$def`, damit verschachtelte Keys und Value-Typen auch
 * dort korrekt sichtbar sind.
 *
 * Beispiel:
 * ```ts
 * $scope.firma.name.$def.onclick = value => console.log(value.value)
 * ```
 */
export type TScopeRuntimeDefinition<SD extends TScopeDefinition> = {
  [K in keyof SD]: SD[K] extends TValueDefinition<any, any, infer V>
    ? TValueDefinition<Extract<K, string>, SD, V>
    : SD[K] extends TScopeDefinition<any>
      ? TScopeRuntimeDefinition<SD[K]>
      : SD[K] extends TArrayDefinition<infer Item>
        ? TArrayDefinition<Item>
        : never;
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

export function createScope<SD extends TScopeEntryDefinition>(definition: SD): TScopeEntry<SD> {
  return undefined as unknown as TScopeEntry<SD>;
}

export function withScopeKey<SD extends TScopeDefinition, K extends string, ND extends TScopeEntryDefinition>(
  scope: TScope<SD>,
  key: TNewScopeKey<SD, K>,
  definition: ND,
): asserts scope is TScope<TExtendScopeDefinition<SD, K, ND>> {
  (scope as Record<string, unknown>)[key] = createScope(definition);
  (scope.$def as Record<string, unknown>)[key] = definition;

  return scope as unknown as void;
}

export function withValue<SD extends TScopeDefinition, K extends string, ND extends TValueDefinition<any, any, any>>(
  scope: TScope<SD>,
  key: TNewScopeKey<SD, K>,
  definition: ND,
): asserts scope is TScope<TExtendScopeDefinition<SD, K, ND>> {
  return withScopeKey(scope, key, definition);
}

export function withScope<SD extends TScopeDefinition, K extends string, ND extends TScopeDefinition>(
  scope: TScope<SD>,
  key: TNewScopeKey<SD, K>,
  definition: ND,
): asserts scope is TScope<TExtendScopeDefinition<SD, K, ND>> {
  return withScopeKey(scope, key, definition);
}

export function withArray<SD extends TScopeDefinition, K extends string, ND extends TScopeDefinition>(
  scope: TScope<SD>,
  key: TNewScopeKey<SD, K>,
  definition: ND,
): asserts scope is TScope<TExtendScopeDefinition<SD, K, TArrayDefinition<ND>>> {
  return withScopeKey(scope, key, defineArray(definition));
}

const $scope = createScope({
  zeit: {
    onclick(value, event) {
      $scope.wurst.value = 'Bratwurst';
      value.element.getAttribute('wrust');

      console.log('Zeit clicked!', value, event);
    },
  },
  wurst: {
    defaultValue: 'lecker',

    onclick(value, event) {
      console.log('Wurst clicked!', value, event);
    },
  },
  arbeitgeber: defineScope({
    name: {
      onclick: (value) => {
        value.element.getAttribute('wrust');
      },
    },
    position: {
      defaultValue: 'Position',
    },
  }),
});

$scope.wurst.$scope.wurst.value;
$scope.arbeitgeber.name.$scope.$def.name.onclick = (value, event) => console.log('New click handler', value, event);

withValue($scope, 'key2', {
  defaultValue: 'value2',
});

$scope.key2.$def.onclick = (value) => console.log(value);

withScope($scope, 'firma', {
  name: {
    defaultValue: 'ACME',
    onclick: (value) => console.log('Firma name clicked!', value.value, value.$scope),
  },
});

$scope.firma.name.$def.onclick = (value) => console.log(value);

withArray($scope, 'mitarbeiter', {
  name: {
    defaultValue: 'Max',
  },
});

$scope.mitarbeiter[0].name.value = 'wurst';
$scope.mitarbeiter.at(0).name.value = 'wurst';
$scope.mitarbeiter.first().name.value = 'wurst';
$scope.mitarbeiter.last().name.value = 'wurst';

const mitarbeiterIterator = $scope.mitarbeiter[Symbol.iterator]();
const ersterMitarbeiter = mitarbeiterIterator.next().value;
if (ersterMitarbeiter) {
  ersterMitarbeiter.name.value = 'wurst';
}

$scope.mitarbeiter.$def.item.name.defaultValue = 'Moritz';
