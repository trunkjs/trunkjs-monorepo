import type { FormValuePluginInterface } from '../FormValuePluginInterface';

export class SelectValuePlugin implements FormValuePluginInterface {
  supportedElements = [
    {
      tagnames: ['select'],
    },
  ];

  getValue(element: HTMLElement): unknown {
    return (element as HTMLSelectElement).value;
  }

  setValue(element: HTMLElement, value: unknown): void {
    (element as HTMLSelectElement).value = value == null ? '' : String(value);
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
