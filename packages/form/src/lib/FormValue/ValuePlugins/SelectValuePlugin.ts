import type { FormValuePluginInterface } from '../FormValuePluginInterface';

export class SelectValuePlugin implements FormValuePluginInterface {
  supportedElements = [
    {
      tagnames: ['select'],
    },
  ];

  getValue(element: HTMLElement): unknown {
    const select = element as HTMLSelectElement;
    return select.multiple ? Array.from(select.selectedOptions, (option) => option.value) : select.value;
  }

  setValue(element: HTMLElement, value: unknown): void {
    const select = element as HTMLSelectElement;

    if (!select.multiple) {
      select.value = value == null ? '' : String(value);
      return;
    }

    const selectedValues = new Set(Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]);
    for (const option of Array.from(select.options)) {
      option.selected = selectedValues.has(option.value);
    }
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
