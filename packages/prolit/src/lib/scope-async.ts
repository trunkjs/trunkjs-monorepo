import { diagnose, notify, registerOperation, type ScopeRuntime } from './scope-runtime';

export interface ScopeError {
  message: string;
  cause: unknown;
}
export type ScopeResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: ScopeError }
  | { status: 'cancelled'; reason: 'superseded' | 'disconnected' | 'busy' };
export interface ScopeResource<T, Args extends unknown[] = []> {
  readonly data: T | undefined;
  readonly pending: boolean;
  readonly error: ScopeError | null;
  reload(...args: Args): Promise<ScopeResult<T>>;
}
export interface ScopeAction<T, Args extends unknown[] = []> {
  (...args: Args): Promise<ScopeResult<T>>;
  readonly pending: boolean;
  readonly error: ScopeError | null;
}
function validateMessage(message: string): void {
  if (typeof message !== 'string' || !message.trim())
    throw new TypeError('errorMessage must be a non-empty public message.');
}
function ownerBinding(operation: object, connected: (runtime: ScopeRuntime) => void): () => ScopeRuntime | undefined {
  let owner: ScopeRuntime | undefined;
  registerOperation(operation, (runtime) => {
    if (owner && owner !== runtime) throw new Error('Create a separate resource/action for each scope.');
    if (owner) return;
    owner = runtime;
    connected(runtime);
  });
  return () => owner;
}

/** Explicit read with latest-request-wins semantics. See README, section 02.
 * @example users: scopeResource({ load: ({signal}) => api.list({signal}), errorMessage: 'Cannot load users.' })
 */
export function scopeResource<T, Args extends unknown[] = []>(options: {
  load: (context: { signal: AbortSignal }, ...args: Args) => Promise<T>;
  errorMessage: string;
  retainData?: boolean;
}): ScopeResource<T, Args> {
  validateMessage(options.errorMessage);
  let data: T | undefined;
  let pending = false;
  let error: ScopeError | null = null;
  let active: { controller: AbortController; cancel(reason: 'superseded' | 'disconnected'): void } | undefined;
  const resource: ScopeResource<T, Args> = {
    get data() {
      return data;
    },
    get pending() {
      return pending;
    },
    get error() {
      return error;
    },
    reload(...args) {
      const runtime = owner();
      if (!runtime?.binding) return Promise.resolve({ status: 'cancelled', reason: 'disconnected' });
      active?.cancel('superseded');
      pending = true;
      error = null;
      if (options.retainData === false) data = undefined;
      notify(runtime);
      return new Promise<ScopeResult<T>>((resolve) => {
        const controller = new AbortController();
        const attempt = {
          controller,
          cancel(reason: 'superseded' | 'disconnected') {
            if (active !== attempt) return;
            active = undefined;
            pending = false;
            resolve({ status: 'cancelled', reason });
            controller.abort();
          },
        };
        active = attempt;
        const finish = (result: ScopeResult<T>) => {
          if (active !== attempt) return; // Also rejects results from loaders ignoring abort.
          active = undefined;
          pending = false;
          if (result.status === 'success') data = result.data;
          if (result.status === 'error') {
            error = result.error;
            diagnose(runtime, error.cause, 'resource');
          }
          notify(runtime);
          resolve(result);
        };
        try {
          Promise.resolve(options.load({ signal: controller.signal }, ...args)).then(
            (data) => finish({ status: 'success', data }),
            (cause) => finish({ status: 'error', error: { message: options.errorMessage, cause } }),
          );
        } catch (cause) {
          finish({ status: 'error', error: { message: options.errorMessage, cause } });
        }
      });
    },
  };
  const owner = ownerBinding(resource, (runtime) => {
    runtime.disconnectors.add(() => active?.cancel('disconnected'));
  });
  return resource;
}

/** Callable asynchronous action; a second concurrent call returns cancelled/busy.
 * Writes survive disconnect and are never silently retried. See README, section 02.
 * @example save: scopeAction({ run: (draft: Draft) => api.save(draft), errorMessage: 'Cannot save.' })
 */
export function scopeAction<T, Args extends unknown[] = []>(options: {
  run: (...args: Args) => Promise<T>;
  errorMessage: string;
}): ScopeAction<T, Args> {
  validateMessage(options.errorMessage);
  let pending = false;
  let error: ScopeError | null = null;
  const action = Object.defineProperties(
    (...args: Args): Promise<ScopeResult<T>> => {
      const runtime = owner();
      if (!runtime?.binding) return Promise.resolve({ status: 'cancelled', reason: 'disconnected' });
      if (pending) return Promise.resolve({ status: 'cancelled', reason: 'busy' });
      pending = true; // Lock before run(), including reentrant calls in the same task.
      error = null;
      notify(runtime);
      return (async () => {
        try {
          return { status: 'success', data: await options.run(...args) } as const;
        } catch (cause) {
          error = { message: options.errorMessage, cause };
          diagnose(runtime, cause, 'action');
          return { status: 'error', error } as const;
        } finally {
          pending = false;
          notify(runtime);
        }
      })();
    },
    {
      pending: { get: () => pending },
      error: { get: () => error },
    },
  ) as ScopeAction<T, Args>;
  const owner = ownerBinding(action, () => undefined);
  return action;
}
