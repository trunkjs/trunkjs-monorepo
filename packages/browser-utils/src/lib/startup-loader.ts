export type StartupLoaderState = 'loading' | 'ready' | 'pre-visual' | 'visual';
export type StartupLoaderPhase = Exclude<StartupLoaderState, 'loading'>;
export type StartupLoaderScope = 'global' | 'local';
export type StartupElementFinishState = 'ready' | 'disconnected' | 'error';
export type StartupElementStatus = 'waiting' | 'running' | StartupElementFinishState;
export type StartupRunLevelState = 'waiting' | 'running' | 'ready' | 'error';

export type StartupRunLevelElementStatus = {
  element: HTMLElement;
  state: StartupElementStatus;
};

export type StartupRunLevelStatus = {
  runLevel: string;
  root: boolean;
  state: StartupRunLevelState;
  dependsOn: string[];
  blockedBy: string[];
  elements: StartupRunLevelElementStatus[];
};

export type WaitForReadyOptions = {
  target?: HTMLElement;
  dependsOn?: string | readonly string[];
};

export type StartupLoaderRegistrationOptions = {
  runLevel?: string;
  dependsOn?: readonly string[];
};

export interface StartupLoaderRegistration {
  element: HTMLElement;
  runLevel: string;
  dependsOn: string[];
  start: () => void;
  cancel: () => void;
  started: boolean;
  target: HTMLElement | null;
  controller?: StartupLoaderController;
  fallbackTimer?: number;
}

export interface StartupLoaderController {
  readonly element: HTMLElement;
  readonly scope: StartupLoaderScope;
  readonly state: StartupLoaderState;
  register(registration: StartupLoaderRegistration): void;
  finish(element: HTMLElement, state: StartupElementFinishState): void;
  waitFor(dependsOn?: string[], phase?: StartupLoaderPhase): Promise<void>;
  getRunLevelStatus(): StartupRunLevelStatus[];
}

type StartupLoaderHost = HTMLElement & {
  startupLoaderController?: StartupLoaderController;
};

type StartupLoaderGlobal = {
  queue: StartupLoaderRegistration[];
  registrations: WeakMap<HTMLElement, StartupLoaderRegistration>;
  globalController?: StartupLoaderController;
  flushScheduled: boolean;
};

declare global {
  interface CustomEventMap {
    'startup-loader:ready': CustomEvent<void>;
    'startup-loader:pre-visual': CustomEvent<void>;
    'startup-loader:visual': CustomEvent<void>;
    'startup-loader:element-ready': CustomEvent<{
      element: HTMLElement;
      runLevel: string;
      state: StartupElementFinishState;
    }>;
    'startup-loader:error': CustomEvent<{
      message: string;
      element?: HTMLElement;
      error?: unknown;
      runLevels: StartupRunLevelStatus[];
    }>;
  }

  interface Window {
    tj_startup_loader?: StartupLoaderGlobal;
    tj_startup_loader_state?: StartupLoaderState;
  }
}

function normalizeDependsOn(value?: string | readonly string[]): string[] {
  if (!value) return [];
  const values = typeof value === 'string' ? value.split(/[\s,]+/) : [...value];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

class StartupLoaderBridge {
  #state(): StartupLoaderGlobal {
    return (window.tj_startup_loader ??= {
      queue: [],
      registrations: new WeakMap(),
      flushScheduled: false,
    });
  }

  #hostFor(element?: HTMLElement): StartupLoaderHost | null {
    return (
      element?.closest<StartupLoaderHost>('tj-startup-loader') ??
      document.querySelector<StartupLoaderHost>('tj-startup-loader:not([scope="local"])')
    );
  }

  #claim(controller: StartupLoaderController, registration: StartupLoaderRegistration) {
    if (registration.fallbackTimer) window.clearTimeout(registration.fallbackTimer);
    registration.controller = controller;
    const queue = this.#state().queue;
    const index = queue.indexOf(registration);
    if (index >= 0) queue.splice(index, 1);
    controller.register(registration);
  }

  #removeFromQueue(registration: StartupLoaderRegistration) {
    if (registration.fallbackTimer) window.clearTimeout(registration.fallbackTimer);
    const queue = this.#state().queue;
    const index = queue.indexOf(registration);
    if (index >= 0) queue.splice(index, 1);
  }

  #startWithoutLoader(registration: StartupLoaderRegistration, message?: string) {
    if (registration.started || registration.controller) return;
    if (message) console.error(`[StartupLoader] ${message}`, registration.target, registration.element);
    registration.started = true;
    try {
      registration.start();
    } catch (error) {
      console.error(
        '[StartupLoader] Element initialization failed without an active loader.',
        error,
        registration.element,
      );
    }
  }

  #flush() {
    const state = this.#state();
    state.flushScheduled = false;
    for (const registration of [...state.queue]) {
      registration.target ??= this.#hostFor(registration.element);
      const controller =
        (registration.target as StartupLoaderHost | null)?.startupLoaderController ??
        (!registration.target ? state.globalController : undefined);
      if (controller) {
        this.#claim(controller, registration);
      } else if (!registration.target) {
        state.queue.splice(state.queue.indexOf(registration), 1);
        this.#startWithoutLoader(registration);
      } else {
        registration.fallbackTimer ??= window.setTimeout(() => {
          state.queue.splice(state.queue.indexOf(registration), 1);
          this.#startWithoutLoader(
            registration,
            'The loader element was found but not initialized within 4 seconds. Continuing without coordination.',
          );
        }, 4000);
      }
    }
  }

  #scheduleFlush() {
    const state = this.#state();
    if (state.flushScheduled) return;
    state.flushScheduled = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.#flush(), { once: true });
    } else {
      queueMicrotask(() => this.#flush());
    }
  }

  connect(controller: StartupLoaderController): boolean {
    const state = this.#state();
    (controller.element as StartupLoaderHost).startupLoaderController = controller;

    const isPrimary = controller.scope !== 'global' || !state.globalController || state.globalController === controller;
    if (controller.scope === 'global' && isPrimary) state.globalController = controller;

    for (const registration of [...state.queue]) {
      if (registration.target === controller.element || (!registration.target && controller.scope === 'global')) {
        this.#claim(controller, registration);
      }
    }
    this.updateState(controller);
    return isPrimary;
  }

  disconnect(controller: StartupLoaderController) {
    const state = this.#state();
    const host = controller.element as StartupLoaderHost;
    if (host.startupLoaderController === controller) delete host.startupLoaderController;
    if (state.globalController === controller) {
      delete state.globalController;
      delete window.tj_startup_loader_state;
    }
  }

  updateState(controller: StartupLoaderController) {
    if (this.#state().globalController === controller) window.tj_startup_loader_state = controller.state;
  }

  controllerFor(target?: HTMLElement): StartupLoaderController | undefined {
    const state = this.#state();
    const host = this.#hostFor(target);
    return host?.startupLoaderController ?? (!host ? state.globalController : undefined);
  }

  async waitForController(target?: HTMLElement): Promise<StartupLoaderController | undefined> {
    let controller = this.controllerFor(target);
    if (controller) return controller;
    if (document.readyState === 'loading') {
      await new Promise<void>((resolve) =>
        document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }),
      );
      controller = this.controllerFor(target);
      if (controller) return controller;
    }

    const host = this.#hostFor(target);
    if (!host) return undefined;
    await Promise.race([
      customElements.whenDefined('tj-startup-loader'),
      new Promise((resolve) => window.setTimeout(resolve, 4000)),
    ]);
    controller = host.startupLoaderController ?? this.#state().globalController;
    if (!controller) {
      console.error(
        '[StartupLoader] The loader element was found but not initialized within 4 seconds. Falling back to window.load.',
        host,
      );
    }
    return controller;
  }

  register(
    element: HTMLElement,
    options: StartupLoaderRegistrationOptions,
    start: () => void,
    cancel: () => void = () => undefined,
  ) {
    const state = this.#state();
    const previous = state.registrations.get(element);
    if (previous && !previous.controller) {
      this.#removeFromQueue(previous);
      previous.started = true;
      previous.cancel();
    }
    const target = this.#hostFor(element);
    const registration: StartupLoaderRegistration = {
      element,
      runLevel: options.runLevel?.trim() || element.localName,
      dependsOn: normalizeDependsOn(options.dependsOn),
      start,
      cancel,
      started: false,
      target,
    };
    state.registrations.set(element, registration);

    const controller = target?.startupLoaderController ?? (!target ? state.globalController : undefined);
    if (controller) this.#claim(controller, registration);
    else {
      state.queue.push(registration);
      this.#scheduleFlush();
    }
  }

  finish(element: HTMLElement, finishState: StartupElementFinishState) {
    const state = this.#state();
    const registration = state.registrations.get(element);
    if (!registration) return;
    if (registration.controller) {
      registration.controller.finish(element, finishState);
    } else if (finishState === 'disconnected') {
      this.#removeFromQueue(registration);
      registration.started = true;
      registration.cancel();
      state.registrations.delete(element);
    }
  }

  normalizeDependsOn(value?: string | readonly string[]) {
    return normalizeDependsOn(value);
  }
}

export const startupLoaderBridge = new StartupLoaderBridge();
