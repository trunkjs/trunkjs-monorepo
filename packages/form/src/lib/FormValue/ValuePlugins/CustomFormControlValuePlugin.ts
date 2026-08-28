import type { FormValuePluginInterface } from '../FormValuePluginInterface';

export interface CustomFormControlElement extends HTMLElement {
  value: unknown;
  disabled?: boolean;
  valid?: boolean;
  invalid?: boolean;
  validated?: boolean;
}

export function isCustomFormControlElement(element: HTMLElement): element is CustomFormControlElement {
  return element.tagName.includes('-') && 'value' in element;
}

export class CustomFormControlValuePlugin implements FormValuePluginInterface {
  supportedElements = [];

  supports(element: HTMLElement): boolean {
    return isCustomFormControlElement(element);
  }

  getValue(element: HTMLElement): unknown {
    return (element as CustomFormControlElement).value;
  }

  setValue(element: HTMLElement, value: unknown): void {
    (element as CustomFormControlElement).value = value;
  }

  skipChildren(_element: HTMLElement): boolean {
    return true;
  }
}
