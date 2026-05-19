import { Scope, ScopeDefinition, ScopeDefinitionInput } from './scope-types';
import { ScopeArray } from './ScopeArray';
import { ScopeProxy } from './ScopeProxy';

export function defineScope<const T extends ScopeDefinition>(definition: T & ScopeDefinitionInput<T>): Scope<T> {
  return new ScopeProxy(definition as T) as Scope<T>;
}

export function defineArray<const T extends ScopeDefinition>(definition: T & ScopeDefinitionInput<T>): ScopeArray<T> {
  return new ScopeArray(definition as T);
}
