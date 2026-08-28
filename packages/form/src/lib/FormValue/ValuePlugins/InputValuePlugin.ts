import type { FormValuePluginInterface } from '../FormValuePluginInterface';

const supportedInputTypes = [
  '',
  'color',
  'date',
  'datetime-local',
  'email',
  'file',
  'hidden',
  'month',
  'number',
  'password',
  'range',
  'search',
  'tel',
  'text',
  'time',
  'url',
  'week',
] as const;

export class InputValuePlugin implements FormValuePluginInterface {
  supportedElements = [
    {
      tagnames: ['input'],
      types: [...supportedInputTypes],
    },
  ];

  getValue(element: HTMLElement): unknown {
    const input = element as HTMLInputElement;
    return input.type === 'file' ? Array.from(input.files ?? []) : input.value;
  }

  setValue(element: HTMLElement, value: unknown): void {
    const input = element as HTMLInputElement;

    if (input.type === 'file') {
      if (value == null || (Array.isArray(value) && value.length === 0)) {
        input.value = '';
      }
      return;
    }

    input.value = value == null ? '' : String(value);
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
