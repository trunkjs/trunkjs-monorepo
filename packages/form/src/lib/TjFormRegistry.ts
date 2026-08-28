import type { TjForm } from '../components/tj-form/tj-form';
import type { FormScopeData } from './FormScope';

export type TjFormPresetValues = FormScopeData | Map<string, unknown> | FormData;

export interface TjFormSubmitContext {
  form: TjForm;
  nativeForm: HTMLFormElement;
  event: SubmitEvent;
  submitter: HTMLElement | null;
  data: FormScopeData;
  map: Map<string, unknown>;
  formData: FormData;
  args: Record<string, unknown>;
}

export type TjFormSubmitHandler = (context: TjFormSubmitContext) => unknown | Promise<unknown>;

export interface TjFormPreset {
  values?: TjFormPresetValues;
  args?: Record<string, unknown>;
  onSubmit?: TjFormSubmitHandler;
  action?: string;
  method?: string;
  fetchOptions?: RequestInit;
}

export class TjFormPresetRegistry {
  private readonly presets = new Map<string, TjFormPreset>();

  public register(name: string, preset: TjFormPreset): this {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('A form preset name must not be empty.');
    }

    this.presets.set(normalizedName, preset);
    return this;
  }

  public unregister(name: string): boolean {
    return this.presets.delete(name.trim());
  }

  public get(name: string | null | undefined): TjFormPreset | undefined {
    return name ? this.presets.get(name.trim()) : undefined;
  }

  public has(name: string): boolean {
    return this.presets.has(name.trim());
  }
}

export const tjFormPresetRegistry = new TjFormPresetRegistry();

export function registerFormPreset(name: string, preset: TjFormPreset): TjFormPresetRegistry {
  return tjFormPresetRegistry.register(name, preset);
}
