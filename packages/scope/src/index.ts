export * from './Event/EventMixin';
export * from './Scope/scope-runtime';
export * from './Scope/scope-types';

export function createScopeDemoMessage(name = 'Scope') {
  return `Hello from ${name}`;
}
