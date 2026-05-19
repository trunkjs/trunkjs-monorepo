import { FormDataContainer } from './FormDataContainer';
import type { Scope, ScopeDefinition, ScopeValueDefinition } from './scope-types';
import type { ScopeProxy } from './ScopeProxy';

export type FormEventListener = (formValue: ScopeValue<any, any>, e: Event) => void;

export class ScopeValue<ValueDef extends ScopeValueDefinition, ScopeDef extends ScopeDefinition | null> {
  #value: unknown = undefined;
  #element: HTMLElement | null = null;

  #arrayPrototype: FormDataContainer | null = null;

  #eventMap = new Map<string, FormEventListener | null>();

  #parent: ScopeProxy<any> | null = null;

  public constructor(
    public readonly name: string,
    private definition: ValueDef = {} as ValueDef,
    scope: ScopeProxy<Extract<ScopeDef, ScopeDefinition>> | null = null,
  ) {
    this.#value = definition?.defaultValue;

    if (definition?.on) {
      for (const [event, listener] of Object.entries(definition.on)) {
        this.on(event, listener);
      }
    }

    if (definition?.onset) {
      this.on('set', definition.onset);
    }

    if (definition?.oninput) {
      this.on('input', definition.oninput);
    }

    if (definition?.onchange) {
      this.on('change', definition.onchange);
    }

    if (definition?.onclick) {
      this.on('click', definition.onclick);
    }

    if (scope) {
      this.connectParent(scope);
    }
  }

  public connectParent(parent: ScopeProxy<any>): void {
    this.#parent = parent;
  }

  public get value(): unknown {
    return this.#value;
  }

  public set value(value: unknown) {
    this.#value = value;
  }

  public get $scope(): ScopeDef extends ScopeDefinition ? Scope<Extract<ScopeDef, ScopeDefinition>> : null {
    return this.#parent as ScopeDef extends ScopeDefinition ? Scope<Extract<ScopeDef, ScopeDefinition>> : null;
  }

  public array(_key: string): FormDataContainer {
    this.#arrayPrototype ??= new FormDataContainer();
    return this.#arrayPrototype;
  }

  public setValue(newValue: unknown, notifySetListener = false): void {
    if (notifySetListener) {
      const setListener = this.getEventListener('set');
      if (setListener) {
        setListener(this, new Event('set'));
      }
    }
    this.#value = newValue;
  }

  public __connectElement(element: HTMLElement | null): void {
    this.#element = element;
  }

  public on(event: string, listener: FormEventListener | null): void {
    this.#eventMap.set(event, listener);
  }

  public getEventListener(event: string): FormEventListener | null {
    return this.#eventMap.get(event) ?? null;
  }

  public get element(): HTMLElement | null {
    return this.#element;
  }

  @FormValueListenerDecorator
  accessor onset: FormEventListener | null = null;

  @FormValueListenerDecorator
  accessor onchange: FormEventListener | null = null;

  @FormValueListenerDecorator
  accessor oninput: FormEventListener | null = null;

  @FormValueListenerDecorator
  accessor onenter: FormEventListener | null = null;
}

function propertyNameToEvent(propertyName: string | symbol): string {
  propertyName = propertyName.toString();
  if (propertyName.startsWith('on')) {
    return propertyName.slice(2).toLowerCase();
  }

  return propertyName.toLowerCase();
}

function FormValueListenerDecorator(
  _value: ClassAccessorDecoratorTarget<ScopeValue<any, any>, FormEventListener | null>,
  context: ClassAccessorDecoratorContext<ScopeValue<any, any>, FormEventListener | null>,
): ClassAccessorDecoratorResult<ScopeValue<any, any>, FormEventListener | null> {
  return {
    get(this: ScopeValue<any, any>): FormEventListener | null {
      return this.getEventListener(propertyNameToEvent(context.name));
    },
    set(this: ScopeValue<any, any>, value: FormEventListener | null): void {
      this.on(propertyNameToEvent(context.name), value);
    },
    init(value: FormEventListener | null): FormEventListener | null {
      return value;
    },
  };
}
