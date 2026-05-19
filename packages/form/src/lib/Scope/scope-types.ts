import { ScopeValue } from '@trunkjs/form';

export type ScopeListener<T extends ScopeValueDefinition> = (value: ScopeValue<T>, event: Event) => void;

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
  [key: string]: ScopeDefinition | ScopeValueDefinition;
};
