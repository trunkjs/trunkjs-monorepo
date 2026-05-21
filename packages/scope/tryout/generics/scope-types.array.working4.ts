export type TScopeValue<VD extends TValueDefinition<any, any>, SD extends TScopeDefinition = TScopeDefinition> = {
  value: unknown;
  element: HTMLElement;
  $$: TValueDefinition<any, SD>;
  $scope: TScopeContainer<SD>;
};

export type TArrayContainer<
  Item extends TScopeDefinition = TScopeDefinition,
  SD extends TScopeDefinition = TScopeDefinition,
> = {
  $$: TArrayDefinition<Item>;
  $scope: TScopeContainer<SD>;
  length: number;
  at(index: number): TScopeContainer<Item> | undefined;
  [index: number]: TScopeContainer<Item>;
  [Symbol.iterator](): IterableIterator<TScopeContainer<Item>>;
};

export type TScopeContainer<SD extends TScopeDefinition = TScopeDefinition> = {
  $$: TScopeDefinitionRuntime<SD>;
  with<K extends string, ND extends TValueDefinition<any, any>>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScopeContainer<TExtendScopeDefinition<SD, K, ND>>;
  withScope<K extends string, ND extends TScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScopeContainer<TExtendScopeDefinition<SD, K, ND>>;
  withArray<K extends string, ND extends TScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is TScopeContainer<TExtendScopeDefinition<SD, K, TArrayDefinition<ND>>>;
} & {
  [K in keyof SD]: SD[K] extends TValueDefinition<any, any>
    ? TValueContainer<SD[K], SD>
    : SD[K] extends TScopeDefinition<any>
      ? TScopeContainer<SD[K]>
      : SD[K] extends TArrayDefinition<infer Item>
        ? TArrayContainer<Item, SD>
        : never;
};

export type TValueContainer<TV extends TValueDefinition<any, any>, SD extends TScopeDefinition = TScopeDefinition> = {
  name: string;
  value: unknown;
  $scope: TScopeContainer<SD>;
  $$: TValueDefinition<any, SD>;
};

export type TScopeListener<TVC extends TValueContainer<any, SD>, SD extends TScopeDefinition = TScopeDefinition> = (
  value: TVC,
  event: Event,
) => void;

export type TScopeDefinitionEntry = TValueDefinition<any, any> | TScopeDefinition | TArrayDefinition<TScopeDefinition>;

export type TNewScopeKey<SD extends TScopeDefinition, K extends string> = K extends keyof SD ? never : K;

export type TExtendScopeDefinition<
  SD extends TScopeDefinition,
  K extends string,
  ND extends TScopeDefinitionEntry,
> = SD & Record<K, ND>;

export type TScopeEntryRuntime<ND extends TScopeDefinitionEntry> =
  ND extends TValueDefinition<any, any>
    ? TValueContainer<ND>
    : ND extends TScopeDefinition
      ? TScopeContainer<ND>
      : ND extends TArrayDefinition<infer Item>
        ? TArrayContainer<Item>
        : never;

// =========== DEFINITION TYPES ===========

export type TValueDefinition<P extends string = string, SD extends TScopeDefinition = TScopeDefinition> = {
  defaultValue?: unknown;
  onclick?: TScopeListener<TValueContainer<TValueDefinition<P, SD>, SD>, SD>;
};

export type TScopeDefinition<K extends string = string> = {
  [P in K]: TValueDefinition<P, TScopeDefinition> | TScopeDefinition | TArrayDefinition<TScopeDefinition>;
};

export type TArrayDefinition<T extends TScopeDefinition> = {
  __type: 'array';
  item: T;
};

export type TScopeDefinitionRuntime<SD extends TScopeDefinition> = {
  [K in keyof SD]: SD[K] extends TValueDefinition<any, any>
    ? TValueDefinition<Extract<K, string>, SD>
    : SD[K] extends TScopeDefinition<any>
      ? TScopeDefinitionRuntime<SD[K]>
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

export function createScope<SD extends TScopeDefinitionEntry>(definition: SD): TScopeEntryRuntime<SD> {
  return undefined as unknown as TScopeEntryRuntime<SD>;
}

export function withScopeKey<SD extends TScopeDefinition, K extends string, ND extends TScopeDefinitionEntry>(
  scope: TScopeContainer<SD>,
  key: TNewScopeKey<SD, K>,
  definition: ND,
): asserts scope is TScopeContainer<TExtendScopeDefinition<SD, K, ND>> {
  (scope as Record<string, unknown>)[key] = createScope(definition);
  (scope.$$ as Record<string, unknown>)[key] = definition;

  return scope as unknown as void;
}

let $scope!: TScopeContainer<typeof $scopeDefinition>;

const $scopeDefinition = {
  zeit: {
    onclick(value, event) {
      $scope.wurst.value = 'Bratwurst';
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
      onclick: (value) => console.log('Arbeitgeber name clicked!', value.value, value.$scope),
    },
    position: {
      defaultValue: 'Position',
    },
  }),
};

$scope = createScope($scopeDefinition);

$scope.wurst.$scope.wurst.value;
$scope.arbeitgeber.name.$scope.$$.name.onclick = (value, event) => console.log('New click handler', value, event);

$scope.with('key2', {
  defaultValue: 'value2',
});

$scope.key2.$$.onclick = (value) => console.log(value);

$scope.withScope('firma', {
  name: {
    defaultValue: 'ACME',
  },
});

$scope.firma.name.$$.onclick = (value) => console.log(value);

$scope.withArray('mitarbeiter', {
  name: {
    defaultValue: 'Max',
  },
});

$scope.mitarbeiter[0].name.value = 'wurst';
$scope.mitarbeiter.at(0)!.name.value = 'wurst';

const mitarbeiterIterator = $scope.mitarbeiter[Symbol.iterator]();
const ersterMitarbeiter = mitarbeiterIterator.next().value;
if (ersterMitarbeiter) {
  ersterMitarbeiter.name.value = 'wurst';
}

$scope.mitarbeiter.$$.item.name.defaultValue = 'Moritz';
