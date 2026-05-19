import type { FormValuePluginInterface } from './FormValuePluginInterface';
import { CheckboxValuePlugin } from './ValuePlugins/CheckboxValuePlugin';
import { InputValuePlugin } from './ValuePlugins/InputValuePlugin';
import { RadioValuePlugin } from './ValuePlugins/RadioValuePlugin';
import { SelectValuePlugin } from './ValuePlugins/SelectValuePlugin';
import { TextareaValuePlugin } from './ValuePlugins/TextareaValuePlugin';

export class FormValuePluginRegistry {
  public readonly plugins: FormValuePluginInterface[] = [];

  public constructor(plugins: FormValuePluginInterface[] = []) {
    this.addPlugins(plugins);
  }

  public addPlugin(plugin: FormValuePluginInterface): this {
    this.plugins.push(plugin);
    return this;
  }

  public addPlugins(plugins: FormValuePluginInterface[]): this {
    for (const plugin of plugins) {
      this.addPlugin(plugin);
    }

    return this;
  }

  public findPlugin(element: HTMLElement): FormValuePluginInterface | null {
    const tagname = element.tagName.toLowerCase();
    const type = element.getAttribute('type')?.toLowerCase() ?? null;

    for (const plugin of this.plugins) {
      const matches = plugin.supportedElements.some((supportedElement) => {
        const normalizedTagnames = supportedElement.tagnames.map((value) => value.toLowerCase());
        if (!normalizedTagnames.includes(tagname)) {
          return false;
        }

        if (supportedElement.types == null) {
          return true;
        }

        const normalizedTypes = supportedElement.types.map((value) => value.toLowerCase());
        return normalizedTypes.includes(type ?? '');
      });

      if (matches) {
        return plugin;
      }
    }

    return null;
  }
}

let formValuePluginRegistrySingleton: FormValuePluginRegistry | null = null;

export function formValuePluginRegistry(): FormValuePluginRegistry {
  if (formValuePluginRegistrySingleton) {
    return formValuePluginRegistrySingleton;
  }

  formValuePluginRegistrySingleton = new FormValuePluginRegistry([
    new CheckboxValuePlugin(),
    new RadioValuePlugin(),
    new InputValuePlugin(),
    new TextareaValuePlugin(),
    new SelectValuePlugin(),
  ]);

  return formValuePluginRegistrySingleton;
}
