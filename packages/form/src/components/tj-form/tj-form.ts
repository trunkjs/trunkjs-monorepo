import type { FormRemoteProxy } from '../../lib/FormRemote';
import { FormScope, type FormScopeData } from '../../lib/FormScope';
import {
  tjFormPresetRegistry,
  type TjFormPreset,
  type TjFormPresetRegistry,
  type TjFormSubmitContext,
  type TjFormSubmitHandler,
} from '../../lib/TjFormRegistry';

const mirroredFormAttributes = [
  'accept-charset',
  'action',
  'autocomplete',
  'enctype',
  'method',
  'name',
  'novalidate',
  'target',
];

export interface TjFormSuccessDetail {
  context: TjFormSubmitContext;
  result: unknown;
}

export interface TjFormErrorDetail {
  context: TjFormSubmitContext;
  error: unknown;
}

export class TjForm extends HTMLElement {
  public static get observedAttributes(): string[] {
    return [...mirroredFormAttributes, 'preset'];
  }

  public registry: TjFormPresetRegistry;
  public submitArgs: Record<string, unknown> = {};
  public fetchOptions: RequestInit = {};
  public onSubmit: TjFormSubmitHandler | null = null;

  private readonly formScope: FormScope;
  private nativeFormElement: HTMLFormElement | null = null;
  private appliedPresetName: string | null = null;

  public constructor(rootElement?: HTMLElement, registry: TjFormPresetRegistry = tjFormPresetRegistry) {
    super();
    this.registry = registry;
    this.formScope = new FormScope(this);

    if (rootElement) {
      this.append(rootElement);
    }
  }

  public connectedCallback(): void {
    const form = this.ensureNativeForm();
    this.syncFormAttributes();
    form.addEventListener('submit', this.handleSubmit);
    this.applyPreset();
  }

  public disconnectedCallback(): void {
    this.nativeFormElement?.removeEventListener('submit', this.handleSubmit);
  }

  public attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }

    if (name === 'preset') {
      this.applyPreset();
      return;
    }

    this.syncFormAttributes();
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

  public get scope(): FormScope {
    return this.formScope;
  }

  public get remote(): FormRemoteProxy {
    return this.formScope.remote;
  }

  public get form(): HTMLFormElement {
    return this.ensureNativeForm();
  }

  public get data(): FormScopeData {
    return this.formScope.data;
  }

  public set data(value: FormScopeData) {
    this.formScope.data = value;
  }

  public get value(): FormScopeData {
    return this.data;
  }

  public set value(value: FormScopeData) {
    this.data = value;
  }

  public get map(): Map<string, unknown> {
    return this.formScope.map;
  }

  public set map(value: Map<string, unknown>) {
    this.formScope.map = value;
  }

  public get formData(): FormData {
    return this.formScope.formData;
  }

  public set formData(value: FormData) {
    this.formScope.formData = value;
  }

  public requestSubmit(submitter?: HTMLButtonElement | HTMLInputElement): void {
    this.form.requestSubmit(submitter);
  }

  public reset(): void {
    this.form.reset();
  }

  public checkValidity(): boolean {
    return this.form.checkValidity();
  }

  public reportValidity(): boolean {
    return this.form.reportValidity();
  }

  private readonly handleSubmit = (event: SubmitEvent): void => {
    void this.processSubmit(event);
  };

  private async processSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    const preset = this.registry.get(this.preset);
    const context = this.createSubmitContext(event, preset);
    const proceed = this.dispatchEvent(
      new CustomEvent<TjFormSubmitContext>('tj-form-submit', { bubbles: true, cancelable: true, detail: context }),
    );
    if (!proceed) {
      return;
    }

    this.toggleAttribute('submitting', true);
    try {
      const handler = this.onSubmit ?? preset?.onSubmit;
      const result = handler ? await handler(context) : await this.submitWithFetch(context, preset);
      this.dispatchEvent(
        new CustomEvent<TjFormSuccessDetail>('tj-form-success', {
          bubbles: true,
          detail: { context, result },
        }),
      );
    } catch (error) {
      const handled = !this.dispatchEvent(
        new CustomEvent<TjFormErrorDetail>('tj-form-error', {
          bubbles: true,
          cancelable: true,
          detail: { context, error },
        }),
      );
      if (!handled) {
        console.error('tj-form submit failed', error);
      }
    } finally {
      this.removeAttribute('submitting');
    }
  }

  private createSubmitContext(event: SubmitEvent, preset?: TjFormPreset): TjFormSubmitContext {
    return {
      form: this,
      nativeForm: this.form,
      event,
      submitter: event.submitter instanceof HTMLElement ? event.submitter : null,
      data: this.data,
      map: this.map,
      formData: this.formData,
      args: { ...preset?.args, ...this.submitArgs },
    };
  }

  private async submitWithFetch(context: TjFormSubmitContext, preset?: TjFormPreset): Promise<Response | undefined> {
    const submitter = context.submitter;
    const action = submitter?.getAttribute('formaction') ?? this.getAttribute('action') ?? preset?.action;
    if (!action) {
      return undefined;
    }

    const method = (
      submitter?.getAttribute('formmethod') ??
      this.getAttribute('method') ??
      preset?.method ??
      'post'
    ).toUpperCase();
    const options: RequestInit = { ...preset?.fetchOptions, ...this.fetchOptions, method };

    if (method === 'GET' || method === 'HEAD') {
      const url = new URL(action, document.baseURI);
      context.formData.forEach((value, name) => {
        url.searchParams.append(name, typeof value === 'string' ? value : value.name);
      });
      return fetch(url, options);
    }

    if (options.body == null) {
      options.body = context.formData;
    }
    return fetch(action, options);
  }

  private ensureNativeForm(): HTMLFormElement {
    if (this.nativeFormElement?.parentElement === this) {
      return this.nativeFormElement;
    }

    const existingForm = Array.from(this.children).find(
      (child): child is HTMLFormElement => child instanceof HTMLFormElement,
    );
    if (existingForm) {
      this.nativeFormElement = existingForm;
      return existingForm;
    }

    const form = document.createElement('form');
    form.setAttribute('data-tj-form-native', '');
    form.style.display = 'contents';
    while (this.firstChild) {
      form.append(this.firstChild);
    }
    this.append(form);
    this.nativeFormElement = form;
    return form;
  }

  private syncFormAttributes(): void {
    const form = this.ensureNativeForm();
    for (const attribute of mirroredFormAttributes) {
      const value = this.getAttribute(attribute);
      if (value == null) {
        if (form.hasAttribute('data-tj-form-native')) {
          form.removeAttribute(attribute);
        }
      } else {
        form.setAttribute(attribute, value);
      }
    }
  }

  private applyPreset(): void {
    if (this.appliedPresetName === this.preset) {
      return;
    }

    this.appliedPresetName = this.preset;
    const values = this.registry.get(this.preset)?.values;
    if (values instanceof FormData) {
      this.formData = values;
    } else if (values instanceof Map) {
      this.map = values;
    } else if (values) {
      this.data = values;
    }
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
