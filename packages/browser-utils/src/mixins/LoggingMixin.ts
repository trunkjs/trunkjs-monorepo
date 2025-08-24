import { Logger } from '../lib/Logger';

type Constructor<T = object> = abstract new (...args: any[]) => T;

let elementId = 1;

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
 *
 *   // Create a new Logger Instance
 *   const logger = this.getLogger("loader1");
 *   logger.log("This is a log message from loader1");
 *
 *   <my-element debug></my-element>       // enables debug logging
 */
export function LoggingMixin<TBase extends Constructor<object>>(Base: TBase) {
  abstract class LoggingClass extends Base {
    #debugCached: boolean | null = null;
    #myElementId: number = elementId++;

    /**
     * Clears the cached debug flag so the attribute will be checked again
     * on the next log/warn/error call.
     */
    public invalidateDebugCache() {
      this.#debugCached = null;
    }

    #myLoggerInstance: Logger | null = null;

    public get _debug(): boolean {
      if (this.#debugCached !== null) return this.#debugCached;
      if (this instanceof HTMLElement) {
        this.#debugCached =
          this.hasAttribute('debug') && !['false', '0', 'off', 'no'].includes(this.getAttribute('debug') || '');
      }

      if (this.#debugCached === true) {
        // @ts-expect-error - it says tagName is not defined -whatever
        console.log(`[DEBUG][ID:${this.#myElementId}] LoggingMixin: Debug mode is enabled for <${this.tagName}>`, this);
      }

      return this.#debugCached ?? false;
    }

    public getLogger(instanceId = 'main'): Logger {
      if (!this.#myLoggerInstance) {
        this.#myLoggerInstance = new Logger(this._debug, `${this.#myElementId}`, instanceId);
      }
      return this.#myLoggerInstance;
    }

    log(...args: any[]) {
      this.getLogger().log(...args);
    }

    warn(...args: any[]) {
      // Always log warnings, even if debug is off, to ensure visibility of issues
      this.getLogger().warn(...args);
    }

    error(...args: any[]) {
      // Always log errors, even if debug is off, to ensure visibility of issues
      this.getLogger().error(...args);
    }
  }

  return LoggingClass;
}
