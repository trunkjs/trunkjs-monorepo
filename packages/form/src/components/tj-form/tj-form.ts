import { FormDataAccessor, type FormDataAccessorEntry } from '@trunkjs/browser-utils';
import {
  DEFAULT_FORM_PRESET,
  tjFormRegistry,
  type TjFormContext,
  type TjFormPreset,
  type TjFormRegistry,
} from '../../lib/TjFormRegistry';

export type TjFormSubmitDetail = TjFormContext;

/** A small named value container for native and custom form controls. */
export class TjForm extends HTMLElement {
  public static get observedAttributes(): string[] {
    return ['preset'];
  }

  private readonly dataAccessor = new FormDataAccessor(this);
  private unsubscribeRegistry: (() => void) | null = null;
  private pluginCleanups: Array<() => void> = [];
  private activePreset: TjFormPreset | undefined;

  public constructor(public registry: TjFormRegistry = tjFormRegistry) {
    super();
  }

  public connectedCallback(): void {
    this.addEventListener('click', this.handleClick);
    this.watchPreset();
  }

  public disconnectedCallback(): void {
    this.removeEventListener('click', this.handleClick);
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;
    this.disconnectPlugins();
  }

  public attributeChangedCallback(): void {
    if (this.isConnected) {
      this.watchPreset();
    }
  }

  public get name(): string {
    return this.getAttribute('name') ?? '';
  }

  public set name(value: string) {
    if (value) {
      this.setAttribute('name', value);
    } else {
      this.removeAttribute('name');
    }
  }

  public get preset(): string {
    return this.getAttribute('preset')?.trim() || DEFAULT_FORM_PRESET;
  }

  public set preset(value: string) {
    if (value && value !== DEFAULT_FORM_PRESET) {
      this.setAttribute('preset', value);
    } else {
      this.removeAttribute('preset');
    }
  }

  public get value(): Record<string, unknown> {
    return this.dataAccessor.data;
  }

  public set value(value: Record<string, unknown>) {
    this.dataAccessor.data = value;
  }

  public get entries(): FormDataAccessorEntry[] {
    return this.dataAccessor.entries;
  }

  public getElements(): HTMLElement[] {
    return this.entries.map(({ element }) => element);
  }

  public async requestSubmit(submitter: HTMLElement | null = null, sourceEvent: Event | null = null): Promise<unknown> {
    // Prevents handlers from starting feedback or network work while a form control is invalid.
    if (!this.validateControls()) {
      return undefined;
    }

    const context = this.createContext(submitter, sourceEvent);
    const proceed = this.dispatchEvent(
      new CustomEvent<TjFormSubmitDetail>('tj-form-submit', {
        bubbles: true,
        cancelable: true,
        detail: context,
      }),
    );

    if (!proceed) {
      return undefined;
    }

    return this.activePreset?.onSubmit?.(context);
  }

  private readonly handleClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    const submitter = target?.closest<HTMLElement>('button, input, [type="submit"]');
    if (!submitter || submitter.closest('tj-form') !== this || !this.isSubmitter(submitter)) {
      return;
    }

    event.preventDefault();
    void this.requestSubmit(submitter, event);
  };

  private isSubmitter(element: HTMLElement): boolean {
    if (element instanceof HTMLButtonElement) {
      return (element.getAttribute('type') ?? 'submit').toLowerCase() === 'submit';
    }
    if (element instanceof HTMLInputElement) {
      return ['submit', 'image'].includes(element.type.toLowerCase());
    }
    return element.getAttribute('type')?.toLowerCase() === 'submit';
  }

  // Validates native and form-associated custom controls before dispatching the submit event.
  private validateControls(): boolean {
    const invalidControls: Array<HTMLElement & { reportValidity?: () => boolean; focus?: () => void }> = [];

    for (const element of this.getElements()) {
      const control = element as HTMLElement & {
        checkValidity?: () => boolean;
        reportValidity?: () => boolean;
        focus?: () => void;
        checkVisibility?: (options?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
      };

      // Standardmäßig werden nur sichtbare Elemente validiert, damit der Aufbau von Multipage-Elementen erleichtert wird.
      if (!this.isVisibleControl(control) || typeof control.checkValidity !== 'function' || control.checkValidity()) {
        continue;
      }

      invalidControls.push(control);
    }

    // Reports every invalid control so all visible validation messages are shown at once.
    invalidControls.forEach((control) => control.reportValidity?.());
    invalidControls[0]?.focus?.();
    return invalidControls.length === 0;
  }

  // Uses the browser visibility API where available and falls back to the relevant HTML visibility states.
  private isVisibleControl(control: HTMLElement & { checkVisibility?: (options?: object) => boolean }): boolean {
    if (control.hidden || control.closest('[hidden]')) {
      return false;
    }

    if (typeof control.checkVisibility === 'function') {
      return control.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
    }

    const style = window.getComputedStyle(control);
    return style.display !== 'none' && style.visibility !== 'hidden';
  }

  private createContext(submitter: HTMLElement | null, sourceEvent: Event | null): TjFormContext {
    return {
      form: this,
      submitter,
      sourceEvent,
      value: this.value,
      getElements: () => this.getElements(),
    };
  }

  private watchPreset(): void {
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = this.registry.subscribe(this.preset, (preset) => this.activatePreset(preset));
    this.activatePreset(this.registry.get(this.preset));
  }

  private activatePreset(preset: TjFormPreset | undefined): void {
    this.disconnectPlugins();
    this.activePreset = preset;

    if (!preset) {
      return;
    }
    if (preset.value) {
      this.value = preset.value;
    }

    for (const plugin of preset.plugins ?? []) {
      const cleanup = plugin.connect(this);
      if (cleanup) {
        this.pluginCleanups.push(cleanup);
      }
    }
  }

  private disconnectPlugins(): void {
    this.pluginCleanups.splice(0).forEach((cleanup) => cleanup());
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-form')) {
  customElements.define('tj-form', TjForm);
}

declare global {
  interface HTMLElementTagNameMap {
    'tj-form': TjForm;
  }
}
