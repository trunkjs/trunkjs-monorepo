import {
  LoggingMixin,
  StartupElementFinishState,
  StartupElementStatus,
  startupLoaderBridge,
  StartupLoaderController,
  StartupLoaderPhase,
  StartupLoaderRegistration,
  StartupLoaderScope,
  StartupLoaderState,
  StartupRunLevelStatus,
} from '@trunkjs/browser-utils';
import { ScrollHandler } from '../../lib/scroll-handler';
import style from './startup-loader.scss?inline';

const ELEMENT_TIMEOUT_MS = 4000;

type RegistrationInfo = {
  registration: StartupLoaderRegistration;
  status: StartupElementStatus;
  startedAt?: number;
  timeout?: number;
};

type RunLevelInfo = {
  name: string;
  registrations: Set<RegistrationInfo>;
  dependsOn: Set<string>;
  dependencySignatures: Set<string>;
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
  #runLevels = new Map<string, RunLevelInfo>();
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
    this.#runLevels.clear();
    this.#waiters.clear();
  }

  register(registration: StartupLoaderRegistration) {
    const previous = this.#registrations.get(registration.element);
    if (previous) {
      if (previous.registration === registration) return;
      if (previous.timeout) window.clearTimeout(previous.timeout);
      if (previous.status === 'waiting') previous.registration.cancel();
      this.#removeRegistration(previous);
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
    this.#registrations.set(registration.element, info);
    const runLevel = this.#runLevels.get(registration.runLevel) ?? {
      name: registration.runLevel,
      registrations: new Set<RegistrationInfo>(),
      dependsOn: new Set<string>(),
      dependencySignatures: new Set<string>(),
    };
    const signature = this.#dependencySignature(registration.dependsOn);
    if (runLevel.dependencySignatures.size > 0 && !runLevel.dependencySignatures.has(signature)) {
      this.warn(
        `Runlevel "${registration.runLevel}" was registered with different dependencies. The dependencies are merged for the whole runlevel.`,
        {
          existing: [...runLevel.dependsOn],
          registered: registration.dependsOn,
          element: registration.element,
        },
      );
    }
    runLevel.registrations.add(info);
    runLevel.dependencySignatures.add(signature);
    for (const dependency of registration.dependsOn) runLevel.dependsOn.add(dependency);
    this.#runLevels.set(runLevel.name, runLevel);

    this.debug('Registered startup element.', {
      runLevel: registration.runLevel,
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
    if (finishState === 'disconnected' && info.status === 'waiting') info.registration.cancel();
    info.status = finishState;

    this.dispatchEvent(
      new CustomEvent('startup-loader:element-ready', {
        detail: { element, runLevel: info.registration.runLevel, state: finishState },
        bubbles: true,
        composed: true,
      }),
    );
    this.debug('Startup element finished.', {
      runLevel: info.registration.runLevel,
      state: finishState,
      duration: info.startedAt ? Date.now() - info.startedAt : 0,
      element,
    });
    this.#schedule();
  }

  waitFor(dependsOn: string[] = [], phase: StartupLoaderPhase = 'ready'): Promise<void> {
    if (dependsOn.length === 0 && stateOrder[this.#state] >= stateOrder[phase]) return Promise.resolve();
    if (dependsOn.length > 0 && dependsOn.every((runLevel) => this.#isRunLevelSettled(runLevel))) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.#waiters.add({ dependsOn, phase, resolve, reject });
      this.#resolveWaiters();
    });
  }

  getRunLevelStatus(): StartupRunLevelStatus[] {
    return [...this.#runLevels.values()].map((runLevel) => {
      const elements = [...runLevel.registrations].map((info) => ({
        element: info.registration.element,
        state: info.status,
      }));
      let state: StartupRunLevelStatus['state'] = 'ready';
      if (elements.some((element) => element.state === 'running')) state = 'running';
      else if (elements.some((element) => element.state === 'waiting')) state = 'waiting';
      else if (elements.some((element) => element.state === 'error')) state = 'error';

      return {
        runLevel: runLevel.name,
        root: runLevel.dependsOn.size === 0,
        state,
        dependsOn: [...runLevel.dependsOn],
        blockedBy: [...runLevel.dependsOn].filter((dependency) => !this.#isRunLevelSettled(dependency)),
        elements,
      };
    });
  }

  #closeRegistration = () => {
    this.#registrationClosed = true;
    this.debug(`Startup registration closed with ${this.#registrations.size} element(s).`, {
      roots: [...this.#runLevels.values()].filter((runLevel) => runLevel.dependsOn.size === 0).map(({ name }) => name),
      runLevels: this.getRunLevelStatus(),
    });
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

    for (const runLevel of this.#runLevels.values()) {
      if (![...runLevel.registrations].some((info) => info.status === 'waiting')) continue;
      const dependenciesReady = [...runLevel.dependsOn].every((dependency) => this.#isRunLevelSettled(dependency));
      const canStart = runLevel.dependsOn.size === 0 || this.#registrationClosed;
      if (canStart && dependenciesReady) this.#startRunLevel(runLevel);
    }

    const waiting = [...this.#registrations.values()].filter((info) => info.status === 'waiting');
    const running = [...this.#registrations.values()].filter((info) => info.status === 'running');

    if (this.#registrationClosed && waiting.length > 0 && running.length === 0) {
      const blockedRunLevels = [...this.#runLevels.values()].filter((runLevel) =>
        [...runLevel.registrations].some((info) => info.status === 'waiting'),
      );
      for (const runLevel of blockedRunLevels) {
        this.#reportError(
          `Runlevel "${runLevel.name}" is blocked (${this.#describeBlock(runLevel)}). Continuing without the unresolved dependencies.`,
          [...runLevel.registrations][0]?.registration.element,
        );
        this.#startRunLevel(runLevel);
      }
    }

    this.#resolveWaiters();

    const hasOpenRegistration = [...this.#registrations.values()].some(
      (info) => info.status === 'waiting' || info.status === 'running',
    );
    if (this.#registrationClosed && !hasOpenRegistration) void this.#complete();
  }

  #startRunLevel(runLevel: RunLevelInfo) {
    this.debug(`Starting runlevel "${runLevel.name}".`, {
      dependsOn: [...runLevel.dependsOn],
      elements: [...runLevel.registrations].map((info) => info.registration.element),
    });
    for (const info of runLevel.registrations) this.#start(info);
  }

  #start(info: RegistrationInfo) {
    if (info.status !== 'waiting') return;
    if (!info.registration.element.isConnected) {
      info.status = 'disconnected';
      info.registration.cancel();
      return;
    }

    info.status = 'running';
    info.startedAt = Date.now();
    info.registration.started = true;
    info.timeout = window.setTimeout(() => {
      this.#reportError(
        `Startup element in runlevel "${info.registration.runLevel}" did not become ready within ${ELEMENT_TIMEOUT_MS}ms.`,
        info.registration.element,
      );
      this.finish(info.registration.element, 'error');
    }, ELEMENT_TIMEOUT_MS);

    this.debug('Starting startup element.', {
      runLevel: info.registration.runLevel,
      element: info.registration.element,
    });
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

      if (waiter.dependsOn.every((runLevel) => this.#isRunLevelSettled(runLevel))) {
        this.#waiters.delete(waiter);
        waiter.resolve();
        continue;
      }

      if (this.#registrationClosed) {
        const missing = waiter.dependsOn.filter((runLevel) => !this.#runLevels.has(runLevel));
        if (missing.length > 0) {
          const error = new Error(`Unknown startup runlevel: ${missing.join(', ')}`);
          this.#waiters.delete(waiter);
          this.#reportError(error.message, undefined, error);
          waiter.reject(error);
        }
      }
    }
  }

  #isRunLevelSettled(name: string): boolean {
    const runLevel = this.#runLevels.get(name);
    return Boolean(
      runLevel &&
        runLevel.registrations.size > 0 &&
        [...runLevel.registrations].every((info) => ['ready', 'disconnected', 'error'].includes(info.status)),
    );
  }

  #dependencySignature(dependsOn: string[]): string {
    return [...dependsOn].sort().join('\u0000');
  }

  #removeRegistration(info: RegistrationInfo) {
    this.#registrations.delete(info.registration.element);
    const runLevel = this.#runLevels.get(info.registration.runLevel);
    if (!runLevel) return;
    runLevel.registrations.delete(info);
    if (runLevel.registrations.size === 0) {
      this.#runLevels.delete(runLevel.name);
      return;
    }

    runLevel.dependsOn.clear();
    runLevel.dependencySignatures.clear();
    for (const remaining of runLevel.registrations) {
      runLevel.dependencySignatures.add(this.#dependencySignature(remaining.registration.dependsOn));
      for (const dependency of remaining.registration.dependsOn) runLevel.dependsOn.add(dependency);
    }
  }

  #describeBlock(runLevel: RunLevelInfo): string {
    const unresolved = [...runLevel.dependsOn].filter((dependency) => !this.#isRunLevelSettled(dependency));
    const missing = unresolved.filter((dependency) => !this.#runLevels.has(dependency));
    if (missing.length > 0) return `missing runlevel(s): ${missing.join(', ')}`;

    const cycle = this.#findCycle(runLevel.name);
    if (cycle) return `dependency cycle: ${cycle.join(' -> ')}`;
    return `unresolved runlevel(s): ${unresolved.join(', ')}`;
  }

  #findCycle(start: string): string[] | undefined {
    const path: string[] = [];
    const visiting = new Map<string, number>();
    const visited = new Set<string>();

    const visit = (name: string): string[] | undefined => {
      const cycleStart = visiting.get(name);
      if (cycleStart !== undefined) return [...path.slice(cycleStart), name];
      if (visited.has(name) || this.#isRunLevelSettled(name)) return undefined;

      const runLevel = this.#runLevels.get(name);
      if (!runLevel) return undefined;
      visiting.set(name, path.length);
      path.push(name);
      for (const dependency of runLevel.dependsOn) {
        const cycle = visit(dependency);
        if (cycle) return cycle;
      }
      path.pop();
      visiting.delete(name);
      visited.add(name);
      return undefined;
    };

    return visit(start);
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
    const runLevels = this.getRunLevelStatus();
    this.error(message, { element, error, runLevels });
    this.dispatchEvent(
      new CustomEvent('startup-loader:error', {
        detail: { message, element, error, runLevels },
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
