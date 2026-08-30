import type { TjForm } from '../components/tj-form/tj-form';

export interface TjFormContext {
  readonly form: TjForm;
  readonly submitter: HTMLElement | null;
  readonly sourceEvent: Event | null;
  readonly value: Record<string, unknown>;
  getElements(): HTMLElement[];
}

export interface TjFormPlugin {
  connect(form: TjForm): void | (() => void);
}

export interface TjFormPreset {
  value?: Record<string, unknown>;
  plugins?: readonly TjFormPlugin[];
  onSubmit?: (context: TjFormContext) => unknown | Promise<unknown>;
}

export type TjFormRegistryListener = (preset: TjFormPreset | undefined) => void;

/** Stores reusable form values, submit callbacks, and opt-in plugins. */
export class TjFormRegistry {
  private readonly presets = new Map<string, TjFormPreset>();
  private readonly listeners = new Map<string, Set<TjFormRegistryListener>>();

  public register(name: string, preset: TjFormPreset): this {
    const normalizedName = this.normalizeName(name);
    this.presets.set(normalizedName, preset);
    this.notify(normalizedName, preset);
    return this;
  }

  public unregister(name: string): boolean {
    const normalizedName = name.trim();
    const removed = this.presets.delete(normalizedName);
    if (removed) {
      this.notify(normalizedName, undefined);
    }
    return removed;
  }

  public get(name: string | null | undefined): TjFormPreset | undefined {
    return name ? this.presets.get(name.trim()) : undefined;
  }

  public has(name: string): boolean {
    return this.presets.has(name.trim());
  }

  public subscribe(name: string, listener: TjFormRegistryListener): () => void {
    const normalizedName = this.normalizeName(name);
    const listeners = this.listeners.get(normalizedName) ?? new Set<TjFormRegistryListener>();
    listeners.add(listener);
    this.listeners.set(normalizedName, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(normalizedName);
      }
    };
  }

  private normalizeName(name: string): string {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error('A form preset name must not be empty.');
    }
    return normalizedName;
  }

  private notify(name: string, preset: TjFormPreset | undefined): void {
    for (const listener of this.listeners.get(name) ?? []) {
      listener(preset);
    }
  }
}

export const tjFormRegistry = new TjFormRegistry();

export function registerFormPreset(name: string, preset: TjFormPreset): TjFormRegistry {
  return tjFormRegistry.register(name, preset);
}
