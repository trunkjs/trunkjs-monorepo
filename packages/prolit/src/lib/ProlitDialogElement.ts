import { ProlitElement } from './ProlitElement';
import { resolveDialogRenderer, type DialogOpenOptions, type DialogResult, type DialogSession } from './dialog-renderer';

type InputArgs<T> = [T] extends [void] ? [input?: T, options?: DialogOpenOptions] : [input: T, options?: DialogOpenOptions];
type SubmitArgs<T> = [T] extends [void] ? [] : [data: T];
const dialogTypes: unique symbol = Symbol('prolit.dialog.types');
type DialogConstructor<I, R> = new () => ProlitDialogElement<I, R> & {
  readonly [dialogTypes]: { input: I; result: R };
};

/** Inline by default. show()/open() adds a presentation without replacing Prolit rendering. */
export abstract class ProlitDialogElement<TInput = void, TResult = void> extends ProlitElement {
  declare readonly [dialogTypes]: { input: TInput; result: TResult };
  protected input!: TInput;
  protected dialogOptions: DialogOpenOptions = {};
  #session?: DialogSession;
  #pending?: Promise<DialogResult<TResult>>;
  #resolve?: (result: DialogResult<TResult>) => void;
  #reject?: (error: unknown) => void;
  #closing = false;

  static show<I, R>(this: DialogConstructor<I, R>, ...args: InputArgs<I>): Promise<DialogResult<R>> {
    return new this().open(...args);
  }

  /** Assign before mounting. Override onInput to copy typed input into the scope. */
  setInput(input: TInput): void {
    this.input = input;
    this.onInput(input);
  }

  protected onInput(_input: TInput): void {}

  open(...args: InputArgs<TInput>): Promise<DialogResult<TResult>> {
    if (this.#pending) return this.#pending;
    if (this.isConnected) throw new Error('Open a detached dialog instance; connected instances render inline.');
    const options = { ...this.dialogOptions, ...args[1] };
    const renderer = resolveDialogRenderer(options.renderer);
    this.setInput(args[0] as TInput);
    this.#closing = false;
    const pending = new Promise<DialogResult<TResult>>((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
    this.#pending = pending;
    try {
      this.#session = renderer.mount(this, options, () => this.abort());
    } catch (error) {
      this.remove();
      this.#reject?.(error);
      this.#reset();
    }
    return pending;
  }

  submit(...args: SubmitArgs<TResult>): void {
    this.#finish({ submitted: true, data: args[0] as TResult });
  }

  abort(): void { this.#finish({ submitted: false }); }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // A move may reconnect synchronously; genuine external removal cancels the pending result.
    queueMicrotask(() => { if (!this.isConnected && this.#pending) this.abort(); });
  }

  #finish(result: DialogResult<TResult>): void {
    if (this.#closing) return;
    if (!this.#pending) {
      this.dispatchEvent(new CustomEvent<DialogResult<TResult>>('prolit-dialog-result', {
        detail: result, bubbles: true, composed: true,
      }));
      return;
    }
    this.#closing = true;
    // Defer until mount() has returned, including renderers that dismiss synchronously.
    void Promise.resolve().then(async () => {
      const resolve = this.#resolve;
      const reject = this.#reject;
      try {
        await this.#session?.close();
        this.remove();
        this.#reset();
        resolve?.(result);
      } catch (error) {
        this.remove();
        this.#reset();
        reject?.(error);
      }
    });
  }

  #reset(): void {
    this.#session = undefined;
    this.#pending = undefined;
    this.#resolve = undefined;
    this.#reject = undefined;
    this.#closing = false;
  }
}
