import {
  LoggingMixin,
  StartupElementFinishState,
  startupLoaderBridge,
  StartupLoaderController,
  StartupLoaderPhase,
  StartupLoaderRegistration,
  StartupLoaderScope,
  StartupLoaderState,
} from '@trunkjs/browser-utils';
import { ScrollHandler } from '../../lib/scroll-handler';
import style from './startup-loader.scss?inline';

const ELEMENT_TIMEOUT_MS = 4000;

type RegistrationStatus = 'waiting' | 'running' | StartupElementFinishState;

type RegistrationInfo = {
  registration: StartupLoaderRegistration;
  status: RegistrationStatus;
  startedAt?: number;
  timeout?: number;
};

type LoaderWaiter = {
  dependsOn: string[];
  phase: StartupLoaderPhase;
  resolve: () => void;
  reject: (error: Error) => void;
};

const stateOrder: Record<StartupLoaderState, number> = {
  loading: 0,
  ready: 1,
  'pre-visual': 2,
  visual: 3,
};

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function waitForRevealTransition(element: HTMLElement): Promise<void> {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return nextFrame();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, 150);
    element.addEventListener(
      'transitionend',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

export class StartupLoaderElement extends LoggingMixin(HTMLElement) implements StartupLoaderController {
  readonly element = this;

  #state: StartupLoaderState = 'loading';
  #registrations = new Map<HTMLElement, RegistrationInfo>();
  #registrationsById = new Map<string, RegistrationInfo>();
  #settledIds = new Set<string>();
  #waiters = new Set<LoaderWaiter>();
  #registrationClosed = false;
  #scheduleQueued = false;
  #finishing = false;
  #connected = false;
  #startTime = 0;
  #scrollHandler: ScrollHandler | null = null;

  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const styleElement = document.createElement('style');
    styleElement.textContent = style;
    shadowRoot.appendChild(styleElement);

    const rootElement = document.createElement('div');
    rootElement.innerHTML = '<slot name="loader" id="loader"></slot><slot id="main"></slot>';
    shadowRoot.appendChild(rootElement);
  }

  get scope(): StartupLoaderScope {
    return this.getAttribute('scope') === 'local' ? 'local' : 'global';
  }

  get state(): StartupLoaderState {
    return this.#state;
  }

  connectedCallback() {
    if (this.#connected) return;
    this.#connected = true;
    this.#startTime = Date.now();
    this.#registrationClosed = false;
    this.#finishing = false;
    this.#setState('loading');
    this.classList.remove('ready', 'pre-visual', 'visual');
    this.setAttribute('aria-busy', 'true');

    if (!startupLoaderBridge.connect(this)) {
      this.#reportError('Only one global <tj-startup-loader> can be active. Use scope="local" for additional loaders.');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.#closeRegistration, { once: true });
    } else {
      queueMicrotask(this.#closeRegistration);
    }

    this.debug(`Startup loader connected with ${this.scope} scope.`);
  }

  disconnectedCallback() {
    this.#connected = false;
    document.removeEventListener('DOMContentLoaded', this.#closeRegistration);
    startupLoaderBridge.disconnect(this);
    this.#scrollHandler?.disconnectEventListener();
    this.#scrollHandler = null;

    for (const info of this.#registrations.values()) {
      if (info.timeout) window.clearTimeout(info.timeout);
    }
    for (const waiter of this.#waiters) waiter.reject(new Error('Startup loader was disconnected.'));

    this.#registrations.clear();
    this.#registrationsById.clear();
    this.#settledIds.clear();
    this.#waiters.clear();
  }

  register(registration: StartupLoaderRegistration) {
    const previous = this.#registrations.get(registration.element);
    if (previous) {
      if (previous.registration === registration) return;
      if (previous.timeout) window.clearTimeout(previous.timeout);
      this.#registrations.delete(registration.element);
      if (previous.registration.id) {
        this.#registrationsById.delete(previous.registration.id);
        this.#settledIds.delete(previous.registration.id);
      }
    }
    if (this.#finishing || this.#state !== 'loading') {
      this.warn(
        'A startup element registered after the reveal had begun. It will initialize immediately.',
        registration.element,
      );
      registration.started = true;
      try {
        registration.start();
      } catch (error) {
        this.#reportError('Late startup element threw during connectedCallback().', registration.element, error);
      }
      return;
    }

    const info: RegistrationInfo = { registration, status: 'waiting' };
    if (registration.id) {
      const duplicate = this.#registrationsById.get(registration.id);
      if (duplicate) {
        this.#reportError(
          `Duplicate startup-id "${registration.id}". The second element cannot be used as a dependency target.`,
          registration.element,
        );
        registration.id = undefined;
      } else {
        this.#registrationsById.set(registration.id, info);
      }
    }

    this.#registrations.set(registration.element, info);
    this.debug('Registered startup element.', {
      id: registration.id,
      dependsOn: registration.dependsOn,
      element: registration.element,
    });
    this.#schedule();
  }

  finish(element: HTMLElement, finishState: StartupElementFinishState) {
    const info = this.#registrations.get(element);
    if (!info) {
      this.debug('Ignored a ready signal from an unregistered element.', element);
      return;
    }
    if (['ready', 'disconnected', 'error'].includes(info.status)) return;

    if (info.timeout) window.clearTimeout(info.timeout);
    info.status = finishState;
    if (info.registration.id) this.#settledIds.add(info.registration.id);

    this.dispatchEvent(
      new CustomEvent('startup-loader:element-ready', {
        detail: { element, id: info.registration.id, state: finishState },
        bubbles: true,
        composed: true,
      }),
    );
    this.debug('Startup element finished.', {
      id: info.registration.id,
      state: finishState,
      duration: info.startedAt ? Date.now() - info.startedAt : 0,
      element,
    });
    this.#schedule();
  }

  waitFor(dependsOn: string[] = [], phase: StartupLoaderPhase = 'ready'): Promise<void> {
    if (dependsOn.length === 0 && stateOrder[this.#state] >= stateOrder[phase]) return Promise.resolve();
    if (dependsOn.length > 0 && dependsOn.every((id) => this.#settledIds.has(id))) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      this.#waiters.add({ dependsOn, phase, resolve, reject });
      this.#resolveWaiters();
    });
  }

  #closeRegistration = () => {
    this.#registrationClosed = true;
    this.debug(`Startup registration closed with ${this.#registrations.size} element(s).`);
    this.#schedule();
  };

  #schedule() {
    if (this.#scheduleQueued) return;
    this.#scheduleQueued = true;
    queueMicrotask(() => {
      this.#scheduleQueued = false;
      this.#runSchedule();
    });
  }

  #runSchedule() {
    if (!this.#connected || this.#finishing) return;

    for (const info of this.#registrations.values()) {
      if (info.status !== 'waiting') continue;
      if (info.registration.dependsOn.every((id) => this.#settledIds.has(id))) this.#start(info);
    }

    const waiting = [...this.#registrations.values()].filter((info) => info.status === 'waiting');
    const running = [...this.#registrations.values()].filter((info) => info.status === 'running');

    if (this.#registrationClosed && waiting.length > 0 && running.length === 0) {
      for (const info of waiting) {
        const unresolved = info.registration.dependsOn.filter((id) => !this.#settledIds.has(id));
        const missing = unresolved.filter((id) => !this.#registrationsById.has(id));
        const reason =
          missing.length > 0 ? `missing: ${missing.join(', ')}` : `cyclic or blocked: ${unresolved.join(', ')}`;
        this.#reportError(
          `Cannot resolve dependencies for startup element${info.registration.id ? ` "${info.registration.id}"` : ''} (${reason}). Continuing without the unresolved dependencies.`,
          info.registration.element,
        );
        this.#start(info);
      }
    }

    this.#resolveWaiters();

    const hasOpenRegistration = [...this.#registrations.values()].some(
      (info) => info.status === 'waiting' || info.status === 'running',
    );
    if (this.#registrationClosed && !hasOpenRegistration) void this.#complete();
  }

  #start(info: RegistrationInfo) {
    if (info.status !== 'waiting') return;
    if (!info.registration.element.isConnected) {
      info.status = 'disconnected';
      if (info.registration.id) this.#settledIds.add(info.registration.id);
      return;
    }

    info.status = 'running';
    info.startedAt = Date.now();
    info.registration.started = true;
    info.timeout = window.setTimeout(() => {
      this.#reportError(
        `Startup element${info.registration.id ? ` "${info.registration.id}"` : ''} did not become ready within ${ELEMENT_TIMEOUT_MS}ms.`,
        info.registration.element,
      );
      this.finish(info.registration.element, 'error');
    }, ELEMENT_TIMEOUT_MS);

    this.debug('Starting startup element.', info.registration.id ?? info.registration.element);
    try {
      info.registration.start();
    } catch (error) {
      this.#reportError('Startup element threw during connectedCallback().', info.registration.element, error);
      this.finish(info.registration.element, 'error');
    }
  }

  #resolveWaiters() {
    for (const waiter of [...this.#waiters]) {
      if (waiter.dependsOn.length === 0) {
        if (stateOrder[this.#state] < stateOrder[waiter.phase]) continue;
        this.#waiters.delete(waiter);
        waiter.resolve();
        continue;
      }

      if (waiter.dependsOn.every((id) => this.#settledIds.has(id))) {
        this.#waiters.delete(waiter);
        waiter.resolve();
        continue;
      }

      if (this.#registrationClosed) {
        const missing = waiter.dependsOn.filter((id) => !this.#registrationsById.has(id));
        if (missing.length > 0) {
          const error = new Error(`Unknown startup dependency: ${missing.join(', ')}`);
          this.#waiters.delete(waiter);
          this.#reportError(error.message, undefined, error);
          waiter.reject(error);
        }
      }
    }
  }

  async #complete() {
    if (this.#finishing) return;
    this.#finishing = true;

    this.classList.add('ready');
    this.#setState('ready');
    this.#dispatchPhase('startup-loader:ready');

    await nextFrame();
    if (!this.#connected) return;
    this.classList.add('pre-visual');
    this.#setState('pre-visual');
    this.#dispatchPhase('startup-loader:pre-visual');

    await nextFrame();
    if (!this.#connected) return;
    this.classList.add('visual');
    const mainSlot = this.shadowRoot?.querySelector<HTMLElement>('#main');
    if (mainSlot) await waitForRevealTransition(mainSlot);
    if (!this.#connected) return;
    this.#setState('visual');
    this.removeAttribute('aria-busy');
    this.#dispatchPhase('startup-loader:visual');
    this.#registerScrollHandler();
    this.debug(`Startup loader visual after ${Date.now() - this.#startTime}ms.`);
  }

  #setState(state: StartupLoaderState) {
    this.#state = state;
    startupLoaderBridge.updateState(this);
    this.#resolveWaiters();
  }

  #dispatchPhase(name: 'startup-loader:ready' | 'startup-loader:pre-visual' | 'startup-loader:visual') {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
    this.debug(`Dispatched ${name}.`);
  }

  #reportError(message: string, element?: HTMLElement, error?: unknown) {
    this.error(message, element, error);
    this.dispatchEvent(
      new CustomEvent('startup-loader:error', {
        detail: { message, element, error },
        bubbles: true,
        composed: true,
      }),
    );
  }

  #registerScrollHandler() {
    const selector = this.getAttribute('observe-scroll-element');
    let scrollElement: Window | HTMLElement | null = window;
    if (selector) {
      scrollElement = document.querySelector<HTMLElement>(selector);
      if (!scrollElement) {
        this.warn(`observe-scroll-element="${selector}" did not match an element. Scroll restoration is disabled.`);
        return;
      }
    }
    this.#scrollHandler = new ScrollHandler(scrollElement);
    this.#scrollHandler.connectEventListener();
    this.#scrollHandler.restoreScrollPosition();
  }
}

if (customElements.get('tj-startup-loader')) {
  console.error(
    '[StartupLoader] tj-startup-loader is already defined. Check for duplicate imports or custom element definitions.',
  );
} else {
  customElements.define('tj-startup-loader', StartupLoaderElement);
}
