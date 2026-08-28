import type { TjForm } from '../components/tj-form/tj-form';
import type { FormScopeData } from './FormScope';

export type TjFormLifecyclePhase = 'init' | 'load' | 'validate' | 'submit' | 'success';

export interface TjFormContext {
  form: TjForm;
  nativeForm: HTMLFormElement;
  data: FormScopeData;
  map: Map<string, unknown>;
  formData: FormData;
  args: Record<string, unknown>;
}

export interface TjFormSubmitContext extends TjFormContext {
  event: SubmitEvent;
  submitter: HTMLElement | null;
}

export interface TjFormErrorContext {
  context: TjFormContext | TjFormSubmitContext;
  error: unknown;
  phase: TjFormLifecyclePhase;
}

export type TjFormLifecycleHandler = (context: TjFormContext) => unknown | Promise<unknown>;
export type TjFormValidateHandler = (context: TjFormSubmitContext) => boolean | void | Promise<boolean | void>;
export type TjFormSubmitHandler = (context: TjFormSubmitContext) => unknown | Promise<unknown>;
export type TjFormSuccessHandler = (context: TjFormSubmitContext, result: unknown) => unknown | Promise<unknown>;
export type TjFormErrorHandler = (failure: TjFormErrorContext) => unknown | Promise<unknown>;

/**
 * Lifecycle hooks and connector configuration for a group of forms.
 *
 * Controllers contain behavior, not initial form values. Load or restore data
 * inside `onLoad` by assigning `context.form.data`, `.map`, or `.formData`.
 */
export interface TjFormController {
  args?: Record<string, unknown>;
  onInit?: TjFormLifecycleHandler;
  onLoad?: TjFormLifecycleHandler;
  onValidate?: TjFormValidateHandler;
  onSubmit?: TjFormSubmitHandler;
  onSuccess?: TjFormSuccessHandler;
  onError?: TjFormErrorHandler;
  action?: string;
  method?: string;
  fetchOptions?: RequestInit;
}

export type TjFormRegistryListener = (controller: TjFormController | undefined) => void;

export class TjFormRegistry {
  private readonly controllers = new Map<string, TjFormController>();
  private readonly listeners = new Map<string, Set<TjFormRegistryListener>>();

  public register(name: string, controller: TjFormController): this {
    const normalizedName = this.normalizeName(name);
    this.controllers.set(normalizedName, controller);
    this.notify(normalizedName, controller);
    return this;
  }

  public unregister(name: string): boolean {
    const normalizedName = name.trim();
    const removed = this.controllers.delete(normalizedName);
    if (removed) {
      this.notify(normalizedName, undefined);
    }
    return removed;
  }

  public get(name: string | null | undefined): TjFormController | undefined {
    return name ? this.controllers.get(name.trim()) : undefined;
  }

  public has(name: string): boolean {
    return this.controllers.has(name.trim());
  }

  /**
   * Observe a registry key. This makes element and controller load order
   * independent: a connected form is activated when its controller appears.
   */
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
      throw new Error('A form controller name must not be empty.');
    }
    return normalizedName;
  }

  private notify(name: string, controller: TjFormController | undefined): void {
    for (const listener of this.listeners.get(name) ?? []) {
      listener(controller);
    }
  }
}

export const tjFormRegistry = new TjFormRegistry();

export function registerFormController(name: string, controller: TjFormController): TjFormRegistry {
  return tjFormRegistry.register(name, controller);
}
