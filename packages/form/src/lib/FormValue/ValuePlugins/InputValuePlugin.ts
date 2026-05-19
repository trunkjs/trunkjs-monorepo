import type { FormValuePluginInterface } from '../FormValuePluginInterface';

const supportedInputTypes = [
  '',
  'color',
  'date',
  'datetime-local',
  'email',
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
    return (element as HTMLInputElement).value;
  }

  setValue(element: HTMLElement, value: unknown): void {
    (element as HTMLInputElement).value = value == null ? '' : String(value);
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
