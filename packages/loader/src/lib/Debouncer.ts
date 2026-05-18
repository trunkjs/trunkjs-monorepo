/**
 * Copy of browserutils Debouncer.
 *
 * Important: Loader Component must be standalone package!
 */
export class Debouncer {
  private timeout: NodeJS.Timeout | null = null;
  private startTimeWithMs = 0;

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
        this.timeout = null;
      }
    }
    return new Promise((resolve) => {
      if (this.timeout) return; // If there's already a timeout, we don't set a new one, just wait for the existing one to resolve

      this.timeout = setTimeout(() => {
        this.timeout = null;
        this.startTimeWithMs = 0; // Reset start time after the wait is complete
        resolve(true);
      }, this.delay);
    });
  }
}
