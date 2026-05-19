import { ArrayDefinition, ScopeDefinition } from './scope-types';
import { ScopeArray } from './ScopeArray';

export function defineScope<const T extends ScopeDefinition>(definition: T): T {
  return definition;
}

export function defineArray<const T extends ScopeDefinition>(definition: T): ArrayDefinition<T> {
  return {
    __type: 'array',
    item: definition as T,
  };
}

export function createScope<T extends ScopeDefinition>(definition: T): ScopeArray<T> {
  return new ScopeArray(definition);
}
