/** Internal connection protocol. Public consumers use prolit(scope) instead. */
export type ErrorPhase = 'render' | 'event' | 'connect' | 'cleanup' | 'resource' | 'action';
export interface ScopeDiagnostic {
  scope: object;
  cause: unknown;
  phase: ErrorPhase;
  expression?: string;
}
export interface ScopeBinding {
  changed(): void;
  diagnose(error: ScopeDiagnostic): void;
}
export interface ScopeRuntime {
  scope: object;
  binding?: ScopeBinding;
  cleanup?: () => void;
  connect?: () => void | (() => void);
  queued: boolean;
  revision: number;
  disconnectors: Set<() => void>;
  legacyUpdate?: () => void;
}
const scopes = new WeakMap<object, ScopeRuntime>();
const operations = new WeakMap<object, (runtime: ScopeRuntime) => void>();

export function registerScope(scope: object): ScopeRuntime {
  const runtime: ScopeRuntime = { scope, queued: false, revision: 0, disconnectors: new Set() };
  scopes.set(scope, runtime);
  return runtime;
}
export function getRuntime(scope: unknown): ScopeRuntime | undefined {
  return scope !== null && (typeof scope === 'object' || typeof scope === 'function') ? scopes.get(scope) : undefined;
}
export function registerOperation(operation: object, bind: (runtime: ScopeRuntime) => void): void {
  operations.set(operation, bind);
}
export function bindOperation(value: unknown, runtime: ScopeRuntime): void {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    operations.get(value)?.(runtime);
  }
}
export function notify(runtime: ScopeRuntime): void {
  runtime.revision++;
  if (!runtime.binding) {
    runtime.legacyUpdate?.();
    return;
  }
  if (runtime.queued) return;
  runtime.queued = true;
  queueMicrotask(() => {
    runtime.queued = false;
    runtime.binding?.changed();
  });
}
export function diagnose(
  runtime: ScopeRuntime | undefined,
  cause: unknown,
  phase: ErrorPhase,
  expression?: string,
): void {
  const error = { scope: runtime?.scope ?? {}, cause, phase, expression };
  if (runtime?.binding) {
    // A failing diagnostic sink must never turn an operation into a rejection.
    try {
      runtime.binding.diagnose(error);
    } catch (listenerError) {
      console.error(listenerError);
    }
  } else {
    console.error('Prolit scope error', error);
  }
}
export function disconnect(runtime: ScopeRuntime, binding: ScopeBinding): void {
  if (runtime.binding !== binding) return;
  runtime.binding = undefined; // Reads must be inactive before user cleanup runs.
  for (const cancel of runtime.disconnectors) cancel();
  const cleanup = runtime.cleanup;
  runtime.cleanup = undefined;
  try {
    cleanup?.();
  } catch (cause) {
    try {
      binding.diagnose({ scope: runtime.scope, cause, phase: 'cleanup' });
    } catch (error) {
      console.error(error);
    }
  }
}
export function connect(runtime: ScopeRuntime, binding: ScopeBinding): void {
  if (runtime.binding === binding) return;
  if (runtime.binding) throw new Error('A Prolit scope can only have one active mount.');
  runtime.binding = binding;
  try {
    const cleanup = runtime.connect?.();
    if (cleanup !== undefined && typeof cleanup !== 'function') {
      // Consume a mistakenly returned Promise without accepting asynchronous cleanup.
      void Promise.resolve(cleanup).catch((cause) => diagnose(runtime, cause, 'connect'));
      throw new TypeError('$connect must return void or a synchronous cleanup function.');
    }
    runtime.cleanup = typeof cleanup === 'function' ? cleanup : undefined;
  } catch (cause) {
    disconnect(runtime, binding);
    throw cause;
  }
}
