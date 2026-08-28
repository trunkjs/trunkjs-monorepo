import { createScope as createBaseScope } from '@trunkjs/scope';

import { ScopeValue } from './ScopeValue';
import type { ArrayDefinition, Scope, ScopeDefinition } from './scope-types';

export function defineScope<const T extends ScopeDefinition>(definition: T): T {
  return definition;
}

export function defineArray<const T extends ScopeDefinition>(definition: T): ArrayDefinition<T> {
  return {
    __type: 'array',
    item: definition,
  };
}

export function createFormScope<T extends ScopeDefinition>(definition: T): Scope<T> {
  return createBaseScope(definition, {
    createValue: ((name: string, valueDefinition: unknown, scope: unknown, root: unknown) =>
      new ScopeValue(name, valueDefinition as never, scope as never, root as never)) as never,
  }) as Scope<T>;
}

export const createScope = createFormScope;
