export class Debouncer {
  private timeout: NodeJS.Timeout | null = null;
  private startTimeWithMs = 0;

  private maxTimeout: NodeJS.Timeout | null = null;

  /**
   *
   * @param delay     Debounce delay in milliseconds
   * @param max_delay Maximum delay in milliseconds, if false then no maximum delay is applied
   */
  constructor(
    private delay: number,
    private max_delay: number | false = false,
  ) {}

  public async wait() {
    if (this.startTimeWithMs === 0) {
      this.startTimeWithMs = Date.now();
    }
    if (this.timeout) {
      if (this.max_delay === false || this.startTimeWithMs + this.max_delay > Date.now()) {
        clearTimeout(this.timeout);
      }
    }
    return new Promise((resolve) => {
      this.timeout = setTimeout(() => {
        this.startTimeWithMs = 0; // Reset start time after the wait is complete
        resolve(true);
      }, this.delay);
    });
  }

  public debounce(callback: () => void) {
    const now = Date.now();

    if (this.startTimeWithMs === 0) {
      this.startTimeWithMs = now;
    }

    const fire = () => {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      if (this.maxTimeout) {
        clearTimeout(this.maxTimeout);
        this.maxTimeout = null;
      }
      this.startTimeWithMs = 0;
      callback();
    };

    // (Re-)schedule normal debounce timer
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(fire, this.delay);

    // Ensure at least one fire every max_delay while calls keep coming
    if (this.max_delay !== false && !this.maxTimeout) {
      const elapsed = now - this.startTimeWithMs;
      const remaining = Math.max(0, this.max_delay - elapsed);
      this.maxTimeout = setTimeout(fire, remaining);
    }
  }
}

type MethodCtx = { kind: 'method'; name: string | symbol };

/**
 * Decorator to debounce method calls
 *
 * <example>
 *   @debounce(200, 1000)
 *   onResize() {
 *   // This method will be debounced with a delay of 200ms and a maximum delay of 1000ms
 *   }
 * </example>
 *
 * @param delay
 * @param maxDelay
 */
export function debounce(delay: number, maxDelay: number | false = false) {
  const instances = new WeakMap<object, Map<string | symbol, Debouncer>>();

  return function <This, Args extends any[], Ret>(
    value: (this: This, ...args: Args) => Ret,
    context: MethodCtx,
  ): (this: This, ...args: Args) => Ret {
    if (context.kind !== 'method') return value;

    const key = context.name;

    return function (this: This, ...args: Args): Ret {
      let map = instances.get(this as any);
      if (!map) {
        map = new Map();
        instances.set(this as any, map);
      }

      let deb = map.get(key);
      if (!deb) {
        deb = new Debouncer(delay, maxDelay);
        map.set(key, deb);
      }

      // Debounced call -> original return value can't be produced synchronously.
      // So we return undefined (typed as Ret via cast) to satisfy signature.
      deb.debounce(() => value.apply(this, args));
      return undefined as unknown as Ret;
    };
  };
}
