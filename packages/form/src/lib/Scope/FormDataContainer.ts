import { ScopeValue } from './ScopeValue';
import type { ScopeDefinition, ScopeValueInput } from './scope-types';

export type FormDataContainerDefinition = Record<string, unknown>;

export type FormDataContainerValues<TDefinition extends FormDataContainerDefinition> = {
  [TKey in keyof TDefinition]: ScopeValue<ScopeValueInput<TDefinition[TKey]>, ScopeDefinition>;
};

export class FormDataContainer<TDefinition extends FormDataContainerDefinition = FormDataContainerDefinition> {
  protected readonly values: Partial<FormDataContainerValues<TDefinition>> = {};

  public constructor(values: Partial<TDefinition> = {}) {
    for (const [key, value] of Object.entries(values) as Array<
      [keyof TDefinition & string, TDefinition[keyof TDefinition & string]]
    >) {
      this.defineValue(key, value);
    }
  }

  public get<TKey extends keyof TDefinition & string>(key: TKey): FormDataContainerValues<TDefinition>[TKey] {
    if (!this.values[key]) {
      this.defineValue(key, undefined as TDefinition[TKey]);
    }

    return this.values[key] as FormDataContainerValues<TDefinition>[TKey];
  }

  public set<TKey extends keyof TDefinition & string>(
    key: TKey,
    value: TDefinition[TKey] | ScopeValue<ScopeValueInput<TDefinition[TKey]>, ScopeDefinition>,
  ): this {
    const scopeValue =
      value instanceof ScopeValue
        ? value
        : new ScopeValue(key, { defaultValue: value } as ScopeValueInput<TDefinition[TKey]>);

    this.values[key] = scopeValue as FormDataContainerValues<TDefinition>[TKey];

    Object.defineProperty(this, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: scopeValue,
    });

    return this;
  }

  private defineValue<TKey extends keyof TDefinition & string>(key: TKey, value: TDefinition[TKey]): void {
    this.set(key, value);
  }
}
