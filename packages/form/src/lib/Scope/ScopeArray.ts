import { ScopeProxy } from './ScopeProxy';
import type { Scope, ScopeDefinition } from './scope-types';

export type ScopeArrayShape<T extends ScopeDefinition | string> = T extends ScopeDefinition ? Scope<T> : never;

export class ScopeArray<T extends ScopeDefinition, TParent = null> implements Iterable<Scope<T>> {
  protected readonly items: Array<Scope<T>> = [];

  public constructor(public readonly definition: T) {}

  public at(index: number): Scope<T> {
    this.items[index] ??= new ScopeProxy(this.definition) as Scope<T>;
    return this.items[index];
  }

  public push(): Scope<T> {
    return this.at(this.items.length);
  }

  public get length(): number {
    return this.items.length;
  }

  public [Symbol.iterator](): Iterator<Scope<T>> {
    return this.items[Symbol.iterator]();
  }
}
