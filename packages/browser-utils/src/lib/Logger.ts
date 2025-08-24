export class Logger {
  constructor(
    private _debug: boolean,
    private myElementId: string,
    private instanceId = 'main',
  ) {}

  log(...args: any[]) {
    if (this._debug) console.log(`[LOG][ID:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  warn(...args: any[]) {
    // Always log warnings, even if debug is off, to ensure visibility of issues
    console.warn(`[WARN][ID:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  error(...args: any[]) {
    // Always log errors, even if debug is off, to ensure visibility of issues
    console.error(`[ERROR][ID:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  throwError(...args: any[]): never {
    const message = `[ERROR][ID:${this.myElementId}:${this.instanceId}] ${args.join(' ')}`;
    this.error(...args);
    throw new Error(message);
  }
}
