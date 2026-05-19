import type { FormValuePluginInterface } from './FormValue/FormValuePluginInterface';
import { FormValuePluginRegistry, formValuePluginRegistry } from './FormValue/FormValuePluginRegistry';

export type FormScopeData = Record<string, unknown>;

export class FormScope {
  public readonly element: HTMLElement;
  public readonly pluginRegistry: FormValuePluginRegistry;

  public constructor(element: HTMLElement, pluginRegistry: FormValuePluginRegistry = formValuePluginRegistry()) {
    this.element = element;
    this.pluginRegistry = pluginRegistry;
  }

  public get data(): FormScopeData {
    const result: FormScopeData = {};

    this.walkElements((element, plugin) => {
      if (!plugin) {
        return;
      }

      const name = this.getElementName(element);
      if (!name) {
        return;
      }

      const value = plugin.getValue(element);
      if (value === undefined) {
        return;
      }

      result[name] = value;
    });

    return result;
  }

  public set data(value: FormScopeData) {
    this.walkElements((element, plugin) => {
      if (!plugin) {
        return;
      }

      const name = this.getElementName(element);
      if (!name || !Object.prototype.hasOwnProperty.call(value, name)) {
        return;
      }

      plugin.setValue(element, value[name]);
    });
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
    const name = element.getAttribute('name');
    return name && name.length > 0 ? name : null;
  }
}
