import type { FormRemoteProxy } from '../../lib/FormRemote';
import { FormScope, type FormScopeData } from '../../lib/FormScope';
import {
  tjFormRegistry,
  type TjFormContext,
  type TjFormController,
  type TjFormErrorContext,
  type TjFormLifecyclePhase,
  type TjFormRegistry,
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

export type TjFormErrorDetail = TjFormErrorContext;

export class TjForm extends HTMLElement {
  public static get observedAttributes(): string[] {
    return [...mirroredFormAttributes, 'controller'];
  }

  public registry: TjFormRegistry;
  public controllerArgs: Record<string, unknown> = {};
  public fetchOptions: RequestInit = {};
  public onSubmit: TjFormSubmitHandler | null = null;

  private readonly formScope: FormScope;
  private nativeFormElement: HTMLFormElement | null = null;
  private directHooks: TjFormController = {};
  private registeredController: TjFormController | undefined;
  private unsubscribeRegistry: (() => void) | null = null;
  private activationVersion = 0;

  public constructor(rootElement?: HTMLElement, registry: TjFormRegistry = tjFormRegistry) {
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
      return;
    }

    this.syncFormAttributes();
  }

  /** The global registry key selected by the `controller` attribute. */
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

  /** Per-element lifecycle hooks. They override hooks from the global controller. */
  public get hooks(): TjFormController {
    return this.directHooks;
  }

  public set hooks(value: TjFormController) {
    this.directHooks = value;
    if (this.isConnected) {
      void this.activateController(this.registeredController);
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

    const controller = this.resolveController();
    let phase: TjFormLifecyclePhase = 'validate';
    let context = this.createSubmitContext(event, controller);

    try {
      const validationResult = await controller.onValidate?.(context);
      if (validationResult === false) {
        this.dispatchEvent(new CustomEvent<TjFormSubmitContext>('tj-form-invalid', { bubbles: true, detail: context }));
        return;
      }

      context = this.createSubmitContext(event, controller);
      const proceed = this.dispatchEvent(
        new CustomEvent<TjFormSubmitContext>('tj-form-submit', {
          bubbles: true,
          cancelable: true,
          detail: context,
        }),
      );
      if (!proceed) {
        return;
      }

      phase = 'submit';
      this.toggleAttribute('submitting', true);
      const handler = this.onSubmit ?? controller.onSubmit;
      const result = handler ? await handler(context) : await this.submitWithFetch(context, controller);

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

  private createContext(controller: TjFormController): TjFormContext {
    return {
      form: this,
      nativeForm: this.form,
      data: this.data,
      map: this.map,
      formData: this.formData,
      args: { ...controller.args, ...this.controllerArgs },
    };
  }

  private createSubmitContext(event: SubmitEvent, controller: TjFormController): TjFormSubmitContext {
    return {
      ...this.createContext(controller),
      event,
      submitter: event.submitter instanceof HTMLElement ? event.submitter : null,
    };
  }

  private async submitWithFetch(
    context: TjFormSubmitContext,
    controller: TjFormController,
  ): Promise<Response | undefined> {
    const submitter = context.submitter;
    const action = submitter?.getAttribute('formaction') ?? this.getAttribute('action') ?? controller.action;
    if (!action) {
      return undefined;
    }

    const method = (
      submitter?.getAttribute('formmethod') ??
      this.getAttribute('method') ??
      controller.method ??
      'post'
    ).toUpperCase();
    const options: RequestInit = { ...controller.fetchOptions, ...this.fetchOptions, method };

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

  private watchController(): void {
    this.unsubscribeRegistry?.();
    this.unsubscribeRegistry = null;

    if (this.controller) {
      this.unsubscribeRegistry = this.registry.subscribe(this.controller, (controller) => {
        this.registeredController = controller;
        if (this.isConnected) {
          void this.activateController(controller);
        }
      });
    }

    this.registeredController = this.registry.get(this.controller);
    void this.activateController(this.registeredController);
  }

  private resolveController(registeredController = this.registeredController): TjFormController {
    return {
      ...registeredController,
      ...this.directHooks,
      args: { ...registeredController?.args, ...this.directHooks.args },
      fetchOptions: { ...registeredController?.fetchOptions, ...this.directHooks.fetchOptions },
    };
  }

  private async activateController(registeredController: TjFormController | undefined): Promise<void> {
    const version = ++this.activationVersion;
    const controller = this.resolveController(registeredController);
    let phase: TjFormLifecyclePhase = 'init';

    try {
      await controller.onInit?.(this.createContext(controller));
      if (version !== this.activationVersion || !this.isConnected) {
        return;
      }

      phase = 'load';
      this.toggleAttribute('loading', true);
      await controller.onLoad?.(this.createContext(controller));
    } catch (error) {
      await this.handleLifecycleError({ context: this.createContext(controller), error, phase }, controller);
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
}

if (typeof customElements !== 'undefined' && !customElements.get('tj-form')) {
  customElements.define('tj-form', TjForm);
}

declare global {
  interface HTMLElementTagNameMap {
    'tj-form': TjForm;
  }
}
