import type { FormRemoteProxy } from './FormRemote';
import { createFormRemote } from './FormRemote';
import type { FormValuePluginInterface } from './FormValue/FormValuePluginInterface';
import { FormValuePluginRegistry, formValuePluginRegistry } from './FormValue/FormValuePluginRegistry';

export type FormScopeData = Record<string, unknown>;

export interface FormScopeControl {
  element: HTMLElement;
  plugin: FormValuePluginInterface;
  name: string;
  key: string;
  array: boolean;
}

function parseControlName(name: string): { key: string; array: boolean } {
  const array = name.endsWith('[]');
  return { key: array ? name.slice(0, -2) : name, array };
}

function controlType(control: FormScopeControl): string {
  return control.element.getAttribute('type')?.toLowerCase() ?? '';
}

function isDisabled(element: HTMLElement): boolean {
  return element.hasAttribute('disabled') || ('disabled' in element && Boolean(element.disabled));
}

function choiceValue(control: FormScopeControl): unknown {
  const value = control.plugin.getValue(control.element);
  if (value === undefined || value === false) {
    return undefined;
  }

  return controlType(control) === 'checkbox' ? (control.element.getAttribute('value') ?? 'on') : value;
}

export class FormScope {
  public readonly element: HTMLElement;
  public readonly pluginRegistry: FormValuePluginRegistry;
  public readonly remote: FormRemoteProxy;

  public constructor(element: HTMLElement, pluginRegistry: FormValuePluginRegistry = formValuePluginRegistry()) {
    this.element = element;
    this.pluginRegistry = pluginRegistry;
    this.remote = createFormRemote(this);
  }

  public get controls(): FormScopeControl[] {
    const controls: FormScopeControl[] = [];

    this.walkElements((element, plugin) => {
      const name = this.getElementName(element);
      if (!plugin || !name) {
        return;
      }

      const parsedName = parseControlName(name);
      controls.push({ element, plugin, name, ...parsedName });
    });

    return controls;
  }

  public get data(): FormScopeData {
    const result: FormScopeData = {};
    for (const [name, controls] of this.getControlGroups()) {
      const value = this.readControlGroup(controls);
      if (value !== undefined) {
        result[name] = value;
      }
    }
    return result;
  }

  public set data(value: FormScopeData) {
    for (const [name, newValue] of Object.entries(value)) {
      this.setValue(name, newValue);
    }
  }

  public get value(): FormScopeData {
    return this.data;
  }

  public set value(value: FormScopeData) {
    this.data = value;
  }

  public get map(): Map<string, unknown> {
    return new Map(Object.entries(this.data));
  }

  public set map(value: Map<string, unknown>) {
    this.data = Object.fromEntries(value);
  }

  public get formData(): FormData {
    const result = new FormData();
    for (const control of this.controls) {
      if (isDisabled(control.element)) {
        continue;
      }

      const type = controlType(control);
      const value = control.plugin.getValue(control.element);
      if (type === 'checkbox' || type === 'radio') {
        const selectedValue = choiceValue(control);
        if (selectedValue !== undefined) {
          this.appendFormDataValue(result, control.name, selectedValue);
        }
        continue;
      }

      this.appendFormDataValue(result, control.name, value);
    }
    return result;
  }

  public set formData(value: FormData) {
    const controlsByRawName = new Map<string, FormScopeControl[]>();
    for (const control of this.controls) {
      const group = controlsByRawName.get(control.name) ?? [];
      group.push(control);
      controlsByRawName.set(control.name, group);
    }

    for (const [name, controls] of controlsByRawName) {
      const values = value.getAll(name);
      this.writeControlGroup(controls, controls[0]?.array || values.length > 1 ? values : values[0]);
    }
  }

  public getValue(name: string): unknown {
    const controls = this.getControlGroups().get(parseControlName(name).key);
    return controls ? this.readControlGroup(controls) : undefined;
  }

  public setValue(name: string, value: unknown): void {
    const controls = this.getControlGroups().get(parseControlName(name).key);
    if (controls) {
      this.writeControlGroup(controls, value);
    }
  }

  public getControls(name?: string): FormScopeControl[] {
    if (name == null || name === '*') {
      return this.controls;
    }

    const key = parseControlName(name).key;
    return this.controls.filter((control) => control.key === key);
  }

  protected walkElements(visitor: (element: HTMLElement, plugin: FormValuePluginInterface | null) => void): void {
    const visit = (element: HTMLElement) => {
      const plugin = this.pluginRegistry.findPlugin(element);
      visitor(element, plugin);

      if (plugin?.skipChildren(element)) {
        return;
      }

      for (const child of Array.from(element.children)) {
        visit(child as HTMLElement);
      }
    };

    for (const child of Array.from(this.element.children)) {
      visit(child as HTMLElement);
    }
  }

  protected getElementName(element: HTMLElement): string | null {
    const propertyName = 'name' in element && typeof element.name === 'string' ? element.name : null;
    const name = propertyName || element.getAttribute('name');
    return name && name.length > 0 ? name : null;
  }

  private getControlGroups(): Map<string, FormScopeControl[]> {
    const groups = new Map<string, FormScopeControl[]>();
    for (const control of this.controls) {
      const group = groups.get(control.key) ?? [];
      group.push(control);
      groups.set(control.key, group);
    }
    return groups;
  }

  private readControlGroup(controls: FormScopeControl[]): unknown {
    const types = new Set(controls.map(controlType));
    const isArray = controls.some((control) => control.array);

    if (types.size === 1 && types.has('radio')) {
      return controls.map((control) => control.plugin.getValue(control.element)).find((value) => value !== undefined);
    }

    if (types.size === 1 && types.has('checkbox')) {
      if (controls.length === 1 && !isArray) {
        return Boolean(controls[0].plugin.getValue(controls[0].element));
      }
      return controls.map(choiceValue).filter((value) => value !== undefined);
    }

    if (isArray) {
      return controls.flatMap((control) => {
        const value = control.plugin.getValue(control.element);
        return value === undefined ? [] : Array.isArray(value) ? value : [value];
      });
    }

    if (controls.length === 1) {
      return controls[0].plugin.getValue(controls[0].element);
    }

    return controls
      .map((control) => control.plugin.getValue(control.element))
      .filter((value) => value !== undefined)
      .at(-1);
  }

  private writeControlGroup(controls: FormScopeControl[], value: unknown): void {
    const types = new Set(controls.map(controlType));
    const isArray = controls.some((control) => control.array);

    if (types.size === 1 && types.has('radio')) {
      controls.forEach((control) => control.plugin.setValue(control.element, value));
      return;
    }

    if (types.size === 1 && types.has('checkbox')) {
      if (controls.length === 1 && !isArray && typeof value === 'boolean') {
        controls[0].plugin.setValue(controls[0].element, value);
        return;
      }

      const selectedValues = new Set((Array.isArray(value) ? value : value == null ? [] : [value]).map(String));
      controls.forEach((control) => {
        const optionValue = String(control.element.getAttribute('value') ?? 'on');
        control.plugin.setValue(control.element, selectedValues.has(optionValue));
      });
      return;
    }

    if (isArray && Array.isArray(value)) {
      if (controls.length === 1) {
        const currentValue = controls[0].plugin.getValue(controls[0].element);
        controls[0].plugin.setValue(controls[0].element, Array.isArray(currentValue) ? value : value[0]);
        return;
      }

      controls.forEach((control, index) => control.plugin.setValue(control.element, value[index]));
      return;
    }

    controls.forEach((control) => control.plugin.setValue(control.element, value));
  }

  private appendFormDataValue(formData: FormData, name: string, value: unknown): void {
    if (value == null || value === false) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => this.appendFormDataValue(formData, name, item));
      return;
    }

    if (value instanceof Blob) {
      formData.append(name, value);
      return;
    }

    formData.append(name, String(value));
  }
}
