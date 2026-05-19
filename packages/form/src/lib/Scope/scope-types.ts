import type { ScopeArray } from './ScopeArray';
import type { ScopeProxy } from './ScopeProxy';
import type { ScopeValue } from './ScopeValue';

export type ScopeListener<
  TValue extends ScopeValueDefinition = ScopeValueDefinition,
  TScope extends ScopeDefinition = ScopeDefinition,
> = (value: ScopeValue<TValue, TScope>, event: Event) => void;

export type ScopeValueDefinition = Record<string, unknown> & {
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
  [key: string]: ScopeDefinition | ScopeValueDefinition | ScopeArray<any, any>;
};

export type ScopeValueDefinitionFor<TValue extends ScopeValueDefinition, TScope extends ScopeDefinition> = Omit<
  TValue,
  'on' | 'onset' | 'oninput' | 'onchange' | 'onclick'
> & {
  on?: {
    [event: string]: ScopeListener<TValue, TScope>;
  };
  onset?: ScopeListener<TValue, TScope>;
  oninput?: ScopeListener<TValue, TScope>;
  onchange?: ScopeListener<TValue, TScope>;
  onclick?: ScopeListener<TValue, TScope>;
};

export type ScopeDefinitionInput<T extends ScopeDefinition> = {
  [TKey in keyof T]: T[TKey] extends ScopeArray<infer TItemDefinition, any>
    ? ScopeArray<TItemDefinition>
    : T[TKey] extends ScopeValueDefinition
      ? ScopeValueDefinitionFor<Extract<T[TKey], ScopeValueDefinition>, T>
      : T[TKey] extends ScopeDefinition
        ? ScopeDefinitionInput<Extract<T[TKey], ScopeDefinition>>
        : never;
};

export type ScopeValueInput<T> = T extends ScopeValueDefinition ? T : ScopeValueDefinition & { defaultValue?: T };

export type ScopeShape<T extends ScopeDefinition> = {
  [TKey in keyof T]: T[TKey] extends ScopeArray<infer TItemDefinition, any>
    ? ScopeArray<TItemDefinition>
    : T[TKey] extends ScopeValueDefinition
      ? ScopeValue<Extract<T[TKey], ScopeValueDefinition>, T>
      : T[TKey] extends ScopeDefinition
        ? Scope<Extract<T[TKey], ScopeDefinition>>
        : never;
};

export type Scope<T extends ScopeDefinition> = ScopeProxy<T> & ScopeShape<T>;
