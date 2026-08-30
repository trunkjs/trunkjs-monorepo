import type { TjForm } from '../components/tj-form/tj-form';
import type { TjFormPlugin } from '../lib/TjFormRegistry';

export interface EnterNextPluginOptions {
  validate?: (element: HTMLElement, form: TjForm) => boolean | Promise<boolean>;
  focus?: (element: HTMLElement) => void;
}

/** Moves Enter to the next named control after the current control validates. */
export class EnterNextPlugin implements TjFormPlugin {
  public constructor(private readonly options: EnterNextPluginOptions = {}) {}

  public connect(form: TjForm): () => void {
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key !== 'Enter' || event.defaultPrevented || event.isComposing) {
        return;
      }

      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || target.closest('tj-form') !== form || this.isMultiline(target)) {
        return;
      }

      const elements = form.getElements().filter((element) => !this.isDisabled(element));
      const current = elements.find((element) => element === target || element.contains(target));
      if (!current) {
        return;
      }

      event.preventDefault();
      void this.moveNext(form, current, elements);
    };

    form.addEventListener('keydown', handleKeydown);
    return () => form.removeEventListener('keydown', handleKeydown);
  }

  private async moveNext(form: TjForm, current: HTMLElement, elements: HTMLElement[]): Promise<void> {
    const valid = this.options.validate ? await this.options.validate(current, form) : this.validate(current);
    if (!valid) {
      return;
    }

    const next = elements[elements.indexOf(current) + 1];
    if (next) {
      (this.options.focus ?? ((element) => element.focus()))(next);
    }
  }

  private validate(element: HTMLElement): boolean {
    const validityElement = element as HTMLElement & {
      checkValidity?: () => boolean;
      reportValidity?: () => boolean;
    };
    if (typeof validityElement.reportValidity === 'function') {
      return validityElement.reportValidity();
    }
    if (typeof validityElement.checkValidity === 'function') {
      return validityElement.checkValidity();
    }
    return !element.matches(':invalid');
  }

  private isDisabled(element: HTMLElement): boolean {
    return element.hasAttribute('disabled') || element.matches(':disabled');
  }

  private isMultiline(element: HTMLElement): boolean {
    return element instanceof HTMLTextAreaElement || element.getAttribute('contenteditable') === 'true';
  }
}

export function enterNextPlugin(options: EnterNextPluginOptions = {}): EnterNextPlugin {
  return new EnterNextPlugin(options);
}
