import { createScope, ScopeValueRuntime, type TInferValueType } from '@trunkjs/scope';

import { FormDataContainer } from './FormDataContainer';
import type { Scope, ScopeDefinition, ScopeListener, ScopeValueDefinition } from './scope-types';

function createFallbackElement(): HTMLElement {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    return document.createElement('div');
  }

  return {
    getAttribute: () => null,
    setAttribute: () => undefined,
    removeAttribute: () => undefined,
  } as unknown as HTMLElement;
}

function syncDirectEventProperty(
  definition: ScopeValueDefinition<any, any, any, any>,
  event: string,
  listener: ScopeListener | null,
): void {
  if (event === 'set') {
    definition.onset = listener ?? undefined;
    return;
  }

  if (event === 'input') {
    definition.oninput = listener ?? undefined;
    return;
  }

  if (event === 'change') {
    definition.onchange = listener ?? undefined;
    return;
  }

  if (event === 'click') {
    definition.onclick = listener ?? undefined;
    return;
  }

  if (event === 'enter') {
    definition.onenter = listener ?? undefined;
  }
}

function getDirectEventProperty(
  definition: ScopeValueDefinition<any, any, any, any>,
  event: string,
): ScopeListener | null {
  if (event === 'set') {
    return definition.onset ?? null;
  }

  if (event === 'input') {
    return definition.oninput ?? null;
  }

  if (event === 'change') {
    return definition.onchange ?? null;
  }

  if (event === 'click') {
    return definition.onclick ?? null;
  }

  if (event === 'enter') {
    return definition.onenter ?? null;
  }

  return null;
}

export class ScopeValue<
  ValueDef extends ScopeValueDefinition<any, any, any, any> = ScopeValueDefinition,
  ScopeDef extends ScopeDefinition = ScopeDefinition,
  RootScopeDef extends ScopeDefinition = ScopeDef,
> extends ScopeValueRuntime<ValueDef, ScopeDef, RootScopeDef> {
  #connectedElement: HTMLElement | null = null;
  #fallbackElement: HTMLElement = createFallbackElement();
  #arrayPrototype: FormDataContainer | null = null;

  public constructor(
    name: string,
    definition: ValueDef = {} as ValueDef,
    scope?: Scope<ScopeDef, RootScopeDef>,
    root?: Scope<RootScopeDef, RootScopeDef>,
  ) {
    const detachedRoot = (root ?? scope ?? createScope({})) as Scope<RootScopeDef, RootScopeDef>;
    const parentScope = (scope ?? detachedRoot) as Scope<ScopeDef, RootScopeDef>;

    super(name, definition, parentScope as never, detachedRoot as never);

    if (definition.on) {
      for (const [event, listener] of Object.entries(definition.on)) {
        this.on(event, listener ?? null);
      }
    }

    if (definition.onset) {
      this.on('set', definition.onset);
    }

    if (definition.oninput) {
      this.on('input', definition.oninput);
    }

    if (definition.onchange) {
      this.on('change', definition.onchange);
    }

    if (definition.onclick) {
      this.on('click', definition.onclick);
    }

    if (definition.onenter) {
      this.on('enter', definition.onenter);
    }
  }

  public get value(): TInferValueType<ValueDef> {
    return this.$value;
  }

  public set value(value: TInferValueType<ValueDef>) {
    this.$value = value;
  }

  public override get element(): HTMLElement {
    if (!this.#connectedElement) {
      throw new Error(`Element is not connected to ScopeValue "${this.name}"`);
    }

    return this.#connectedElement;
  }

  public override set element(element: HTMLElement) {
    this.#connectedElement = element;
    super.element = element;
  }

  public array(_key: string): FormDataContainer {
    this.#arrayPrototype ??= new FormDataContainer();
    return this.#arrayPrototype;
  }

  public setValue(newValue: TInferValueType<ValueDef>, notifySetListener = false): void {
    if (notifySetListener) {
      this.getEventListener('set')?.(this as never, new Event('set'));
    }

    this.$value = newValue;
  }

  public __connectElement(element: HTMLElement | null): void {
    this.#connectedElement = element;
    super.element = element ?? this.#fallbackElement;
  }

  public on(event: string, listener: ScopeListener | null): void {
    const definition = this.$$ as ValueDef;
    definition.on ??= {};

    if (listener) {
      definition.on[event] = listener;
    } else {
      delete definition.on[event];
    }

    syncDirectEventProperty(definition, event, listener);
  }

  public getEventListener(event: string): ScopeListener | null {
    const definition = this.$$ as ValueDef;
    return definition.on?.[event] ?? getDirectEventProperty(definition, event);
  }

  public get onset(): ScopeListener | null {
    return this.getEventListener('set');
  }

  public set onset(listener: ScopeListener | null) {
    this.on('set', listener);
  }

  public get onchange(): ScopeListener | null {
    return this.getEventListener('change');
  }

  public set onchange(listener: ScopeListener | null) {
    this.on('change', listener);
  }

  public get oninput(): ScopeListener | null {
    return this.getEventListener('input');
  }

  public set oninput(listener: ScopeListener | null) {
    this.on('input', listener);
  }

  public get onclick(): ScopeListener | null {
    return this.getEventListener('click');
  }

  public set onclick(listener: ScopeListener | null) {
    this.on('click', listener);
  }

  public get onenter(): ScopeListener | null {
    return this.getEventListener('enter');
  }

  public set onenter(listener: ScopeListener | null) {
    this.on('enter', listener);
  }
}
