import {
  FormDataAccessor,
  type FormDataAccessorData,
  type FormDataAccessorEntry,
} from '@trunkjs/browser-utils';
import {
  tjFormRegistry,
  type TjFormContext,
  type TjFormController,
  type TjFormErrorContext,
  type TjFormLifecyclePhase,
  type TjFormRegistry,
  type TjFormSubmitContext,
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

export type TjFormErrorDetail = TjFormErrorContext;

export class TjForm extends HTMLElement {
  public static get observedAttributes(): string[] {
    return [...mirroredFormAttributes, 'controller'];
  }

  private readonly dataAccessor = new FormDataAccessor(this);
  private nativeFormElement: HTMLFormElement | null = null;
  private unsubscribeRegistry: (() => void) | null = null;
  private activationVersion = 0;

  public constructor(
    rootElement?: HTMLElement,
    public registry: TjFormRegistry = tjFormRegistry,
  ) {
    super();
    if (rootElement) {
      this.append(rootElement);
    }
  }

  public connectedCallback(): void {
    const form = this.ensureNativeForm();
    this.syncFormAttributes();
    form.addEventListener('submit', this.handleSubmit);
    this.watchController();
  }

  public disconnectedCallback(): void {
    this.nativeFormElement?.removeEventListener('submit', this.handleSubmit);
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;
    this.activationVersion += 1;
  }

  public attributeChangedCallback(name: string): void {
    if (!this.isConnected) {
      return;
    }

    if (name === 'controller') {
      this.watchController();
    } else {
      this.syncFormAttributes();
    }
  }

  public get controller(): string {
    return this.getAttribute('controller') ?? '';
  }

  public set controller(value: string) {
    if (value) {
      this.setAttribute('controller', value);
    } else {
      this.removeAttribute('controller');
    }
  }

  public get form(): HTMLFormElement {
    return this.ensureNativeForm();
  }

  public get data(): FormDataAccessorData {
    return this.dataAccessor.data;
  }

  public set data(value: FormDataAccessorData) {
    this.dataAccessor.data = value;
  }

  public get entries(): FormDataAccessorEntry[] {
    return this.dataAccessor.entries;
  }

  public get formData(): FormData {
    return this.dataAccessor.formData;
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

    const controller = this.registry.get(this.controller) ?? {};
    const context = this.createSubmitContext(event);
    let phase: TjFormLifecyclePhase = 'validate';

    try {
      if ((await controller.onValidate?.(context)) === false) {
        this.dispatchEvent(new CustomEvent('tj-form-invalid', { bubbles: true, detail: context }));
        return;
      }

      const proceed = this.dispatchEvent(
        new CustomEvent('tj-form-submit', { bubbles: true, cancelable: true, detail: context }),
      );
      if (!proceed) {
        return;
      }

      phase = 'submit';
      this.toggleAttribute('submitting', true);
      const result = controller.onSubmit
        ? await controller.onSubmit(context)
        : await this.submitWithFetch(context, controller);

      phase = 'success';
      await controller.onSuccess?.(context, result);
      this.dispatchEvent(
        new CustomEvent<TjFormSuccessDetail>('tj-form-success', {
          bubbles: true,
          detail: { context, result },
        }),
      );
    } catch (error) {
      await this.handleLifecycleError({ context, error, phase }, controller);
    } finally {
      this.removeAttribute('submitting');
    }
  }

  private createContext(): TjFormContext {
    return { form: this };
  }

  private createSubmitContext(event: SubmitEvent): TjFormSubmitContext {
    return {
      form: this,
      event,
      submitter: event.submitter instanceof HTMLElement ? event.submitter : null,
    };
  }

  private async submitWithFetch(
    context: TjFormSubmitContext,
    controller: TjFormController,
  ): Promise<Response | undefined> {
    const action = context.submitter?.getAttribute('formaction') ?? this.getAttribute('action') ?? controller.action;
    if (!action) {
      return undefined;
    }

    const method = (
      context.submitter?.getAttribute('formmethod') ??
      this.getAttribute('method') ??
      controller.method ??
      'post'
    ).toUpperCase();
    const options: RequestInit = { ...controller.fetchOptions, method };

    if (method === 'GET' || method === 'HEAD') {
      const url = new URL(action, document.baseURI);
      this.formData.forEach((value, name) => {
        url.searchParams.append(name, typeof value === 'string' ? value : value.name);
      });
      return fetch(url, options);
    }

    options.body ??= this.formData;
    return fetch(action, options);
  }

  private watchController(): void {
    this.activationVersion += 1;
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;

    if (!this.controller) {
      return;
    }

    this.unsubscribeRegistry = this.registry.subscribe(this.controller, (controller) => {
      this.activationVersion += 1;
      if (this.isConnected && controller) {
        void this.activateController(controller);
      }
    });

    const controller = this.registry.get(this.controller);
    if (controller) {
      void this.activateController(controller);
    }
  }

  private async activateController(controller: TjFormController): Promise<void> {
    const version = ++this.activationVersion;
    let phase: TjFormLifecyclePhase = 'init';

    try {
      await controller.onInit?.(this.createContext());
      if (version !== this.activationVersion || !this.isConnected) {
        return;
      }

      phase = 'load';
      this.toggleAttribute('loading', true);
      await controller.onLoad?.(this.createContext());
    } catch (error) {
      await this.handleLifecycleError({ context: this.createContext(), error, phase }, controller);
    } finally {
      if (version === this.activationVersion) {
        this.removeAttribute('loading');
      }
    }
  }

  private async handleLifecycleError(failure: TjFormErrorContext, controller: TjFormController): Promise<void> {
    try {
      await controller.onError?.(failure);
    } catch (error) {
      console.error('tj-form error hook failed', error);
    }

    const handled = !this.dispatchEvent(
      new CustomEvent<TjFormErrorDetail>('tj-form-error', {
        bubbles: true,
        cancelable: true,
        detail: failure,
      }),
    );
    if (!handled) {
      console.error(`tj-form ${failure.phase} failed`, failure.error);
    }
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
    form.append(...Array.from(this.childNodes));
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
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-form')) {
  customElements.define('tj-form', TjForm);
}

declare global {
  interface HTMLElementTagNameMap {
    'tj-form': TjForm;
  }
}
