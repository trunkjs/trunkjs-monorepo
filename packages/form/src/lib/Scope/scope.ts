import { ArrayDefinition, ScopeDefinition } from './scope-types';
import { ScopeProxy } from './ScopeProxy';

export function defineScope<const T extends ScopeDefinition>(definition: T): T {
  return definition;
}

export function defineArray<const T extends ScopeDefinition>(definition: T): ArrayDefinition<T> {
  return {
    __type: 'array',
    item: definition as T,
  };
}

export function createScope<T extends ScopeDefinition>(definition: T): ScopeProxy<T> {
  return new ScopeProxy(definition);
}
