import type { ScopeValue } from './ScopeValue';

export type ScopeListener<
  TValue extends ScopeValueDefinition = ScopeValueDefinition,
  TScope extends ScopeDefinition = ScopeDefinition,
> = (value: ScopeValue<TValue, TScope>, event: Event) => void;

export type ScopeValueDefinition = {
  defaultValue?: unknown;
  on?: {
    [event: string]: ScopeListener<ScopeValueDefinition>;
  };
  onset?: ScopeListener<ScopeValueDefinition>;
  oninput?: ScopeListener<ScopeValueDefinition>;
  onchange?: ScopeListener<ScopeValueDefinition>;
  onclick?: ScopeListener<ScopeValueDefinition>;
};

export type ScopeDefinition = {
  [key: string]:
    | ScopeDefinition
    | ScopeValueDefinition
    | ArrayDefinition<ScopeDefinition>
    | ArrayDefinition<ScopeValueDefinition>;
};

export type ArrayDefinition<T extends ScopeDefinition | ScopeValueDefinition> = {
  __type: 'array';
  item: T;
};
