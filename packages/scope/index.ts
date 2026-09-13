export * from './src/Event/EventMixin';
export * from './src/Scope/scope-runtime';
export * from './src/Scope/scope-types';

export function createScopeDemoMessage(name = 'Scope') {
  return `Hello from ${name}`;
}
