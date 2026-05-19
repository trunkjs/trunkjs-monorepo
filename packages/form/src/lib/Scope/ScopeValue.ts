import { FormDataContainer } from './FormDataContainer';
import { ScopeDefinition, ScopeValueDefinition } from './scope-types';
import { ScopeProxy } from './ScopeProxy';

export type FormEventListener = (formValue: ScopeValue, e: Event) => void;

export class ScopeValue<T extends ScopeValueDefinition, Parent extends ScopeDefinition | null> {
  #value: unknown = undefined;
  #element: HTMLElement | null = null;

  #arrayPrototype: FormDataContainer | null = null;

  #eventMap = new Map<string, FormEventListener | null>();

  public constructor(
    public readonly name: string,
    private definition: T,
  ) {}

  #parent: ScopeProxy<Parent> | null = null;

  public connectParent(parent: ScopeProxy<Parent>): void {
    this.#parent = parent;
  }

  public get value(): unknown {
    return this.#value;
  }

  public set value(value: unknown) {
    this.#value = value;
  }

  public get $scope(): ScopeProxy<Parent> | null {
    return this.#parent;
  }

  public array(key: string): FormDataContainer {}

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
  _value: ClassAccessorDecoratorTarget<ScopeValue, FormEventListener | null>,
  context: ClassAccessorDecoratorContext<ScopeValue, FormEventListener | null>,
): ClassAccessorDecoratorResult<ScopeValue, FormEventListener | null> {
  return {
    get(this: ScopeValue): FormEventListener | null {
      return this.getEventListener(propertyNameToEvent(context.name));
    },
    set(this: ScopeValue, value: FormEventListener | null): void {
      this.on(propertyNameToEvent(context.name), value);
    },
    init(value: FormEventListener | null): FormEventListener | null {
      return value;
    },
  };
}
