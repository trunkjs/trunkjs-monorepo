type Constructor<T = object> = abstract new (...args: any[]) => T;

/**
 * LoggingMixin
 *
 * A lightweight logging mixin that can be applied to any Custom Element base class
 * (e.g., HTMLElement, LitElement/ReactiveElement, etc.). It provides log, warn,
 * and error methods that only output when debugging is enabled.
 *
 * How it decides whether to log:
 * - On the first call to any of the logging methods (log/warn/error), the mixin
 *   checks the 'debug' attribute on the element instance and caches the result
 *   (ressourcenschonende Attributabfrage mit Caching).
 * - If the 'debug' attribute is present, it is considered truthy unless explicitly
 *
 * Example:
 *   class MyElement extends LoggingMixin(HTMLElement) {}
 *   // or with Lit:
 *   class MyLitEl extends LoggingMixin(ReactiveElement) {}
 *
 *   <my-element debug></my-element>       // enables debug logging
 */
export function LoggingMixin<TBase extends Constructor<object>>(Base: TBase) {
  abstract class LoggingClass extends Base {


    #debugCached: boolean | null = null;

    /**
     * Clears the cached debug flag so the attribute will be checked again
     * on the next log/warn/error call.
     */
    public invalidateDebugCache() {
      this.#debugCached = null;
    }


    public get _debug() {
      if (this.#debugCached !== null) return this.#debugCached;
      if (this instanceof HTMLElement) {
        this.#debugCached = this.hasAttribute('debug') && !['false', '0', 'off', 'no'].includes(this.getAttribute('debug') || '');
      }

      return this.#debugCached;
    }

    log(...args: any[]) {
      if (this._debug) console.log('[LOG]', this, ...args);
    }

    warn(...args: any[]) {
      // Always log warnings, even if debug is off, to ensure visibility of issues
      console.warn('[WARN]', this, ...args);
    }

    error(...args: any[]) {
      // Always log errors, even if debug is off, to ensure visibility of issues
      console.error('[ERROR]', this, ...args);
    }
  }

  return LoggingClass;
}