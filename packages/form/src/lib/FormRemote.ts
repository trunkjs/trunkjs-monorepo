import type { FormScope, FormScopeControl } from './FormScope';

function readBooleanState(element: HTMLElement, property: string): boolean {
  const value = (element as unknown as Record<string, unknown>)[property];
  if (typeof value === 'boolean') {
    return value;
  }

  return element.hasAttribute(property) || element.classList.contains(`is-${property}`);
}

function writeBooleanState(element: HTMLElement, property: string, value: boolean): void {
  if (property in element) {
    try {
      (element as unknown as Record<string, unknown>)[property] = value;
    } catch {
      // Reflecting the state as an attribute still supports read-only custom controls.
    }
  }

  element.toggleAttribute(property, value);
  if (property === 'valid' || property === 'invalid') {
    element.classList.toggle(`is-${property}`, value);
  }
}

export class FormControlRemote {
  public constructor(private readonly control: FormScopeControl) {}

  public get element(): HTMLElement {
    return this.control.element;
  }

  public get name(): string {
    return this.control.key;
  }

  public get value(): unknown {
    return this.control.plugin.getValue(this.control.element);
  }

  public set value(value: unknown) {
    this.control.plugin.setValue(this.control.element, value);
  }

  public get disabled(): boolean {
    return readBooleanState(this.element, 'disabled');
  }

  public set disabled(value: boolean) {
    writeBooleanState(this.element, 'disabled', value);
  }

  public get valid(): boolean {
    if (readBooleanState(this.element, 'valid')) {
      return true;
    }
    if (readBooleanState(this.element, 'invalid')) {
      return false;
    }

    const checkValidity = (this.element as unknown as { checkValidity?: () => boolean }).checkValidity;
    return typeof checkValidity === 'function' ? checkValidity.call(this.element) : false;
  }

  public set valid(value: boolean) {
    writeBooleanState(this.element, 'valid', value);
    if (value) {
      writeBooleanState(this.element, 'invalid', false);
    }
  }

  public get invalid(): boolean {
    return readBooleanState(this.element, 'invalid');
  }

  public set invalid(value: boolean) {
    writeBooleanState(this.element, 'invalid', value);
    if (value) {
      writeBooleanState(this.element, 'valid', false);
    }
  }

  public get validated(): boolean {
    return readBooleanState(this.element, 'validated');
  }

  public set validated(value: boolean) {
    writeBooleanState(this.element, 'validated', value);
  }
}

export class FormControlCollection {
  public constructor(
    private readonly scope: FormScope,
    public readonly name: string | null,
    public readonly controls: FormControlRemote[],
  ) {}

  public get elements(): HTMLElement[] {
    return this.controls.map((control) => control.element);
  }

  public get value(): unknown {
    return this.name == null ? this.controls.map((control) => control.value) : this.scope.getValue(this.name);
  }

  public set value(value: unknown) {
    if (this.name == null) {
      this.controls.forEach((control) => {
        control.value = value;
      });
      return;
    }

    this.scope.setValue(this.name, value);
  }

  public get disabled(): boolean {
    return this.controls.every((control) => control.disabled);
  }

  public set disabled(value: boolean) {
    this.controls.forEach((control) => {
      control.disabled = value;
    });
  }

  public get valid(): boolean {
    return this.controls.every((control) => control.valid);
  }

  public set valid(value: boolean) {
    this.controls.forEach((control) => {
      control.valid = value;
    });
  }

  public get invalid(): boolean {
    return this.controls.some((control) => control.invalid);
  }

  public set invalid(value: boolean) {
    this.controls.forEach((control) => {
      control.invalid = value;
    });
  }

  public get validated(): boolean {
    return this.controls.every((control) => control.validated);
  }

  public set validated(value: boolean) {
    this.controls.forEach((control) => {
      control.validated = value;
    });
  }
}

export class FormRemote {
  public constructor(private readonly scope: FormScope) {}

  public get controls(): FormControlRemote[] {
    return this.scope.controls.map((control) => new FormControlRemote(control));
  }

  public get elements(): HTMLElement[] {
    return this.controls.map((control) => control.element);
  }

  public get names(): string[] {
    return Array.from(new Set(this.scope.controls.map((control) => control.key)));
  }

  public get all(): FormControlCollection {
    return new FormControlCollection(this.scope, null, this.controls);
  }

  public get(name: string): FormControlCollection | undefined {
    if (name === '*') {
      return this.all;
    }

    const controls = this.scope.getControls(name).map((control) => new FormControlRemote(control));
    return controls.length > 0 ? new FormControlCollection(this.scope, name, controls) : undefined;
  }
}

export type FormRemoteProxy = FormRemote & Record<string, unknown>;

export function createFormRemote(scope: FormScope): FormRemoteProxy {
  const remote = new FormRemote(scope);
  return new Proxy(remote, {
    get(target, property, receiver) {
      if (property === '*') {
        return target.all;
      }

      if (typeof property === 'string' && !(property in target)) {
        return target.get(property);
      }

      return Reflect.get(target, property, receiver);
    },
  }) as FormRemoteProxy;
}
