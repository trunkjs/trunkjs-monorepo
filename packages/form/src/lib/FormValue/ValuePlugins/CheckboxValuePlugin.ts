import type { FormValuePluginInterface } from '../FormValuePluginInterface';

export class CheckboxValuePlugin implements FormValuePluginInterface {
  supportedElements = [
    {
      tagnames: ['input'],
      types: ['checkbox'],
    },
  ];

  getValue(element: HTMLElement): unknown {
    return (element as HTMLInputElement).checked;
  }

  setValue(element: HTMLElement, value: unknown): void {
    (element as HTMLInputElement).checked = Boolean(value);
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
