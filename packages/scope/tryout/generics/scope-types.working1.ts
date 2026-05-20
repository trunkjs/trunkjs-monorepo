export type TScopeValue<VD extends TValueDefinition<any, any>, SD extends TScopeDefinition = TScopeDefinition> = {
  value: unknown;
  element: HTMLElement;
  $def: VD;
  $scope: TScopeContainer<SD>;
};

export type TScopeContainer<SD extends TScopeDefinition = TScopeDefinition> = {
  $def: SD;
} & {
  [K in keyof SD]: SD[K] extends TValueDefinition<any, any>
    ? TValueContainer<SD[K], SD>
    : SD[K] extends TScopeDefinition<any>
      ? TScopeContainer<SD[K]>
      : never;
};

export type TValueContainer<TV extends TValueDefinition<any, any>, SD extends TScopeDefinition = TScopeDefinition> = {
  name: string;
  value: unknown;
  $scope: TScopeContainer<SD>;
  $def: TV;
};

export type TScopeListener<TVC extends TValueContainer<any, SD>, SD extends TScopeDefinition = TScopeDefinition> = (
  value: TVC,
  event: Event,
) => void;

// =========== DEFINITION TYPES ===========

export type TValueDefinition<P extends string = string, SD extends TScopeDefinition = TScopeDefinition> = {
  defaultValue?: unknown;
  onclick?: TScopeListener<TValueContainer<TValueDefinition<P, SD>, SD>, SD>;
};

export type TScopeDefinition<K extends string = string> = {
  [P in K]: TValueDefinition<P, TScopeDefinition> | TScopeDefinition;
};

export type ArrayDefinition<T extends TScopeDefinition> = {
  __type: 'array';
  item: T;
};

// ============= API FUNCTIONS =============

export function defineScope<SD extends TScopeDefinition>(definition: SD): SD {
  return definition;
}

export function defineArray<SD extends TScopeDefinition>(definition: SD): ArrayDefinition<SD> {
  return {
    __type: 'array',
    item: definition as SD,
  };
}

export function createScope<SD extends TScopeDefinition>(definition: SD): TScopeContainer<SD> {
  return undefined as unknown as TScopeContainer<SD>;
}

const $scope = createScope({
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
});

$scope.wurst.$scope.wurst.value;
$scope.arbeitgeber.name;
