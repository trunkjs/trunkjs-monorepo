export class Stopwatch {
  private label: string;
  private last: number;
  private startTime: number;
  private running: boolean = false;
  private enabled: boolean;

  constructor(label: string, enabled: boolean = true) {
    this.label = label;
    this.enabled = enabled;
    this.startTime = this.last = performance.now();
    this.running = true;
  }

  lap(msg: string = '') {
    if (!this.enabled) return;
    const now = performance.now();
    const diff = (now - this.last) / 1000;
    this.last = now;
    console.debug(`[${this.label}] ${msg} +${diff.toFixed(3)}s`);
  }

  elapsed(): number {
    return performance.now() - this.startTime;
  }

  reset() {
    this.startTime = this.last = performance.now();
  }

  stop(): number {
    this.running = false;
    return this.elapsed();
  }

  start() {
    this.running = true;
    this.reset();
  }

  isRunning(): boolean {
    return this.running;
  }
}
