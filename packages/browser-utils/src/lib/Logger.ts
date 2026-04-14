export class Logger {
  constructor(
    private _debug: boolean,
    private myTag: string,
    private myElementId: string,
    private instanceId = 'main',
  ) {}

  debug(...args: any[]) {
    if (this._debug) console.debug(`[DEBUG][${this.myTag}:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  log(...args: any[]) {
    console.log(`[LOG][${this.myTag}:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  warn(...args: any[]) {
    // Always log warnings, even if debug is off, to ensure visibility of issues
    console.warn(`[WARN][${this.myTag}:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  error(...args: any[]) {
    // Always log errors, even if debug is off, to ensure visibility of issues
    console.error(`[ERROR][${this.myTag}:${this.myElementId}:${this.instanceId}]`, ...args);
  }

  throwError(...args: any[]): never {
    const message = `[ERROR][${this.myTag}:${this.myElementId}:${this.instanceId}] ${args.join(' ')}`;
    this.error(...args);
    throw new Error(message);
  }
}
