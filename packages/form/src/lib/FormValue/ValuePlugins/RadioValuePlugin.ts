import type { FormValuePluginInterface } from '../FormValuePluginInterface';

export class RadioValuePlugin implements FormValuePluginInterface {
  supportedElements = [
    {
      tagnames: ['input'],
      types: ['radio'],
    },
  ];

  getValue(element: HTMLElement): unknown {
    const input = element as HTMLInputElement;
    return input.checked ? input.value : undefined;
  }

  setValue(element: HTMLElement, value: unknown): void {
    const input = element as HTMLInputElement;
    input.checked = input.value === String(value);
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
