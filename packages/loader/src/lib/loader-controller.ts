export type LoaderVisualStage = 'hidden' | 'measurable' | 'visible';

export type LoaderRunLevelStatus = 'completed' | 'failed' | 'skipped' | 'timed-out';

export interface LoaderRunLevelContext {
  readonly name: string;
  readonly signal: AbortSignal;
  waitUntil(promise: PromiseLike<unknown>): void;
}

export interface LoaderRunLevel {
  name: string;
  start?: (context: LoaderRunLevelContext) => unknown | PromiseLike<unknown>;
  selector?: string;
  settleMs?: number;
  timeoutMs?: number;
  visualStage?: LoaderVisualStage;
}

export interface LoaderRunLevelResult {
  name: string;
  status: LoaderRunLevelStatus;
  durationMs: number;
  errorCount: number;
  pendingElementCount: number;
}

export interface LoaderRunLevelEventDetail extends Omit<LoaderRunLevelResult, 'status'> {
  index: number;
  status: LoaderRunLevelStatus | 'running';
  visualStage?: LoaderVisualStage;
}

export interface LoaderRunOptions {
  eventTarget?: EventTarget;
  startWhen?: PromiseLike<unknown>;
}

type PendingElement = {
  waitStart: number;
};

type ActiveLevel = {
  blockers: Set<Promise<unknown>>;
  closed: boolean;
  controller: AbortController;
  errors: unknown[];
  wake: () => void;
};

const DEFAULT_SETTLE_MS = 100;
const DEFAULT_TIMEOUT_MS = 4000;
const LEGACY_LEVEL_NAME = 'legacy';

function now(): number {
  return Date.now();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createLevelEvent(type: string, detail: LoaderRunLevelEventDetail): CustomEvent<LoaderRunLevelEventDetail> {
  return new CustomEvent(type, { bubbles: true, composed: true, detail });
}

/**
 * Registers and executes ordered startup levels. Components can keep using the
 * existing init:child-* events; their waits are attributed to the active level.
 */
export class LoaderRunLevelRegistry {
  readonly #levels: LoaderRunLevel[] = [];

  register(level: LoaderRunLevel): this {
    const name = level.name.trim();
    if (!name) {
      throw new Error('Loader run level names must not be empty.');
    }
    if (this.#levels.some((candidate) => candidate.name === name)) {
      throw new Error(`Loader run level '${name}' is already registered.`);
    }
    this.#levels.push({ ...level, name });
    return this;
  }

  clear(): void {
    this.#levels.length = 0;
  }

  get levels(): readonly LoaderRunLevel[] {
    return this.#levels.map((level) => ({ ...level }));
  }

  async run(host: HTMLElement, options: LoaderRunOptions = {}): Promise<LoaderRunLevelResult[]> {
    const eventTarget = options.eventTarget ?? window;
    const pendingElements = new Map<HTMLElement, PendingElement>();
    let active: ActiveLevel | null = null;

    const wake = () => active?.wake();
    const onWaitRequest = (event: Event) => {
      const element = (event as CustomEvent<{ element?: HTMLElement }>).detail?.element;
      if (!element) return;
      pendingElements.set(element, { waitStart: now() });
      wake();
    };
    const onReady = (event: Event) => {
      const element = (event as CustomEvent<{ element?: HTMLElement }>).detail?.element;
      if (!element) return;
      const info = pendingElements.get(element);
      if (!info) return;
      pendingElements.delete(element);
      console.debug(`Element ready:`, element, `Waited for ${now() - info.waitStart}ms`);
      wake();
    };

    eventTarget.addEventListener('init:child-waitreq', onWaitRequest);
    eventTarget.addEventListener('init:child-ready', onReady);

    try {
      await options.startWhen;
      const levels = this.#levels.length > 0 ? [...this.#levels] : [{ name: LEGACY_LEVEL_NAME }];
      const results: LoaderRunLevelResult[] = [];

      if (this.#levels.length > 0 && pendingElements.size > 0) {
        results.push(
          await this.#runLevel(host, { name: LEGACY_LEVEL_NAME }, 0, pendingElements, (value) => {
            active = value;
          }),
        );
      }

      const indexOffset = results.length;
      for (const [index, level] of levels.entries()) {
        const result = await this.#runLevel(host, level, index + indexOffset, pendingElements, (value) => {
          active = value;
        });
        results.push(result);
      }

      return results;
    } finally {
      eventTarget.removeEventListener('init:child-waitreq', onWaitRequest);
      eventTarget.removeEventListener('init:child-ready', onReady);
    }
  }

  async #runLevel(
    host: HTMLElement,
    level: LoaderRunLevel,
    index: number,
    pendingElements: Map<HTMLElement, PendingElement>,
    setActive: (active: ActiveLevel) => void,
  ): Promise<LoaderRunLevelResult> {
    const startedAt = now();
    const levelSlug = slug(level.name) || `level-${index}`;
    const controller = new AbortController();
    let wakeResolver: (() => void) | null = null;
    let activityVersion = 0;
    const active: ActiveLevel = {
      blockers: new Set(),
      closed: false,
      controller,
      errors: [],
      wake: () => {
        activityVersion += 1;
        wakeResolver?.();
        wakeResolver = null;
      },
    };
    setActive(active);

    host.setAttribute('data-loader-run-level', level.name);
    if (level.visualStage) {
      host.setAttribute('data-loader-visual-stage', level.visualStage);
    }
    host.classList.add(`run-level-${levelSlug}`);

    const eventBase = {
      durationMs: 0,
      errorCount: 0,
      index,
      name: level.name,
      pendingElementCount: pendingElements.size,
      status: 'running' as const,
      visualStage: level.visualStage,
    };
    host.dispatchEvent(createLevelEvent('loader:run-level-start', eventBase));

    if (level.selector && !document.querySelector(level.selector)) {
      active.closed = true;
      controller.abort();
      const result: LoaderRunLevelResult = {
        name: level.name,
        status: 'skipped',
        durationMs: now() - startedAt,
        errorCount: 0,
        pendingElementCount: pendingElements.size,
      };
      host.classList.add(`run-level-${levelSlug}-complete`);
      host.dispatchEvent(
        createLevelEvent('loader:run-level-complete', { ...result, index, visualStage: level.visualStage }),
      );
      return result;
    }

    const waitUntil = (promiseLike: PromiseLike<unknown>) => {
      if (active.closed) {
        throw new Error(`Loader run level '${level.name}' is already closed.`);
      }
      const promise = Promise.resolve(promiseLike);
      active.blockers.add(promise);
      promise
        .catch((error: unknown) => {
          active.errors.push(error);
          console.error(`Loader run level '${level.name}' failed:`, error);
        })
        .finally(() => {
          active.blockers.delete(promise);
          active.wake();
        });
    };

    try {
      waitUntil(Promise.resolve(level.start?.({ name: level.name, signal: controller.signal, waitUntil })));
    } catch (error) {
      active.errors.push(error);
      console.error(`Loader run level '${level.name}' failed to start:`, error);
    }

    const settleMs = Math.max(0, level.settleMs ?? DEFAULT_SETTLE_MS);
    const timeoutMs = Math.max(settleMs, level.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const deadline = startedAt + timeoutMs;
    let status: LoaderRunLevelStatus = 'completed';

    while (now() < deadline) {
      if (active.blockers.size === 0 && pendingElements.size === 0) {
        const versionBeforeSettle = activityVersion;
        await delay(Math.min(settleMs, Math.max(0, deadline - now())));
        if (versionBeforeSettle === activityVersion && active.blockers.size === 0 && pendingElements.size === 0) {
          status = active.errors.length > 0 ? 'failed' : 'completed';
          break;
        }
        continue;
      }

      await Promise.race([
        new Promise<void>((resolve) => {
          wakeResolver = resolve;
        }),
        delay(Math.max(0, deadline - now())),
      ]);
    }

    if (active.blockers.size > 0 || pendingElements.size > 0) {
      status = 'timed-out';
      console.error(
        `Loader run level '${level.name}' timed out after ${timeoutMs}ms with ${pendingElements.size} waiting element(s) and ${active.blockers.size} promise(s).`,
      );
    }

    const pendingElementCount = pendingElements.size;
    active.closed = true;
    controller.abort();
    pendingElements.clear();
    const result: LoaderRunLevelResult = {
      name: level.name,
      status,
      durationMs: now() - startedAt,
      errorCount: active.errors.length,
      pendingElementCount,
    };
    host.classList.add(`run-level-${levelSlug}-complete`);
    host.dispatchEvent(
      createLevelEvent('loader:run-level-complete', { ...result, index, visualStage: level.visualStage }),
    );
    return result;
  }
}

export const loaderRunLevels = new LoaderRunLevelRegistry();
