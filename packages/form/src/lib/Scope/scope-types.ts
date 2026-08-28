import type {
  TArrayDefinition,
  TExtendScopeDefinition,
  TInferValueType,
  TNewScopeKey,
  TScopeArrayValue,
  TScopeObjectValue,
  TScopeRuntimeDefinition,
  TValueDefinition,
} from '@trunkjs/scope';

import type { FormDataContainer } from './FormDataContainer';

export type ScopeListener = (value: any, event: Event) => void;

export type ScopeValueDefinition<
  P extends string = string,
  SD extends ScopeDefinition = ScopeDefinition,
  V = unknown,
  RootSD extends ScopeDefinition = SD,
> = TValueDefinition<P, SD, V, RootSD>;

export type ScopeDefinition<K extends string = string> = {
  [P in K]: ScopeValueDefinition<P, ScopeDefinition> | ScopeDefinition | ArrayDefinition<ScopeDefinition>;
};

export type ArrayDefinition<T extends ScopeDefinition> = TArrayDefinition<T>;

export type Scope<SD extends ScopeDefinition = ScopeDefinition, RootSD extends ScopeDefinition = SD> = {
  $$: TScopeRuntimeDefinition<SD, RootSD>;
  $root: Scope<RootSD, RootSD>;
  $value: TScopeObjectValue<SD>;
  withValue<K extends string, ND extends ScopeValueDefinition<any, any, any>>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is Scope<TExtendScopeDefinition<SD, K, ND>, RootSD>;
  with<K extends string, ND extends ScopeValueDefinition<any, any, any>>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is Scope<TExtendScopeDefinition<SD, K, ND>, RootSD>;
  withScope<K extends string, ND extends ScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is Scope<TExtendScopeDefinition<SD, K, ND>, RootSD>;
  withArray<K extends string, ND extends ScopeDefinition>(
    key: TNewScopeKey<SD, K>,
    definition: ND,
  ): asserts this is Scope<TExtendScopeDefinition<SD, K, TArrayDefinition<ND>>, RootSD>;
} & {
  [K in keyof SD]: SD[K] extends ScopeValueDefinition<any, any, any>
    ? ScopeValue<SD[K], SD, RootSD>
    : SD[K] extends ScopeDefinition<any>
      ? Scope<SD[K], RootSD>
      : SD[K] extends ArrayDefinition<infer Item>
        ? ScopeArray<Item, SD, RootSD>
        : never;
};

export type ScopeArray<
  Item extends ScopeDefinition = ScopeDefinition,
  SD extends ScopeDefinition = ScopeDefinition,
  RootSD extends ScopeDefinition = SD,
> = {
  $$: ArrayDefinition<Item>;
  $scope: Scope<SD, RootSD>;
  $root: Scope<RootSD, RootSD>;
  $value: TScopeArrayValue<Item>;
  length: number;
  at(index: number): Scope<Item, RootSD>;
  first(): Scope<Item, RootSD>;
  last(): Scope<Item, RootSD>;
  [index: number]: Scope<Item, RootSD>;
  [Symbol.iterator](): IterableIterator<Scope<Item, RootSD>>;
};

export type ScopeValue<
  TV extends ScopeValueDefinition<any, any, any, any> = ScopeValueDefinition,
  SD extends ScopeDefinition = ScopeDefinition,
  RootSD extends ScopeDefinition = SD,
> = {
  name: string;
  value: TInferValueType<TV>;
  $value: TInferValueType<TV>;
  element: HTMLElement;
  $scope: Scope<SD, RootSD>;
  $root: Scope<RootSD, RootSD>;
  $$: TV;
  array(key: string): FormDataContainer;
  setValue(newValue: TInferValueType<TV>, notifySetListener?: boolean): void;
  __connectElement(element: HTMLElement | null): void;
  on(event: string, listener: ScopeListener | null): void;
  getEventListener(event: string): ScopeListener | null;
  onset: ScopeListener | null;
  onchange: ScopeListener | null;
  oninput: ScopeListener | null;
  onclick: ScopeListener | null;
  onenter: ScopeListener | null;
};

export type ScopeValueInput<T> = ScopeValueDefinition<string, ScopeDefinition, T>;
