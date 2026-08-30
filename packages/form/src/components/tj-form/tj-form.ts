import { FormDataAccessor, type FormDataAccessorEntry } from '@trunkjs/browser-utils';
import { tjFormRegistry, type TjFormContext, type TjFormPreset, type TjFormRegistry } from '../../lib/TjFormRegistry';

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
    return this.getAttribute('preset') ?? '';
  }

  public set preset(value: string) {
    if (value) {
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
    const context = this.createContext(submitter, sourceEvent);
    const proceed = this.dispatchEvent(
      new CustomEvent<TjFormSubmitDetail>('tj-form-submit', {
        bubbles: true,
        cancelable: true,
        detail: context,
      }),
    );

    return proceed ? this.activePreset?.onSubmit?.(context) : undefined;
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
    this.unsubscribeRegistry = null;

    if (!this.preset) {
      this.activatePreset(undefined);
      return;
    }

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
