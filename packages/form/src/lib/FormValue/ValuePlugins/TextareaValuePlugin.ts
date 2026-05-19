import type { FormValuePluginInterface } from '../FormValuePluginInterface';

export class TextareaValuePlugin implements FormValuePluginInterface {
  supportedElements = [
    {
      tagnames: ['textarea'],
    },
  ];

  getValue(element: HTMLElement): unknown {
    return (element as HTMLTextAreaElement).value;
  }

  setValue(element: HTMLElement, value: unknown): void {
    (element as HTMLTextAreaElement).value = value == null ? '' : String(value);
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
