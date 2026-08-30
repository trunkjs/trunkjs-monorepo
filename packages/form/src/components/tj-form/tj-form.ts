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
    return ['presets'];
  }

  private readonly dataAccessor = new FormDataAccessor(this);
  private registryCleanups: Array<() => void> = [];
  private pluginCleanups: Array<() => void> = [];
  private activePresets: TjFormPreset[] = [];

  public constructor(public registry: TjFormRegistry = tjFormRegistry) {
    super();
  }

  public connectedCallback(): void {
    this.addEventListener('click', this.handleClick);
    this.watchPresets();
  }

  public disconnectedCallback(): void {
    this.removeEventListener('click', this.handleClick);
    this.disconnectRegistry();
    this.disconnectPlugins();
  }

  public attributeChangedCallback(): void {
    if (this.isConnected) {
      this.watchPresets();
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

  public get presets(): string[] {
    if (!this.hasAttribute('presets')) {
      return [DEFAULT_FORM_PRESET];
    }

    return (this.getAttribute('presets') ?? '')
      .split(/[\s,]+/)
      .map((name) => name.trim())
      .filter(Boolean);
  }

  public set presets(value: readonly string[]) {
    if (value.length > 0) {
      this.setAttribute('presets', value.join(' '));
    } else {
      this.setAttribute('presets', '');
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

    if (!proceed) {
      return undefined;
    }

    let result: unknown;
    for (const preset of this.activePresets) {
      if (preset.onSubmit) {
        result = await preset.onSubmit(context);
      }
    }
    return result;
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

  private watchPresets(): void {
    this.disconnectRegistry();

    for (const name of this.presets) {
      this.registryCleanups.push(this.registry.subscribe(name, () => this.activatePresets()));
    }
    this.activatePresets();
  }

  private activatePresets(): void {
    this.disconnectPlugins();
    this.activePresets = this.presets
      .map((name) => this.registry.get(name))
      .filter((preset): preset is TjFormPreset => preset !== undefined);

    for (const preset of this.activePresets) {
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
  }

  private disconnectRegistry(): void {
    this.registryCleanups.splice(0).forEach((cleanup) => cleanup());
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
