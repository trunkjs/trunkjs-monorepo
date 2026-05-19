import { ScopeDefinition } from './scope-types';
import { ScopeProxy } from './ScopeProxy';

export function defineScope<T extends ScopeDefinition>(definition: T): ScopeProxy<T> {
  return new ScopeProxy(definition);
}

export function defineArray<T extends ScopeDefinition>(definition: T): ScopeArrayProxy<T> {
  return new ScopeArrayProxy(definition);
}
