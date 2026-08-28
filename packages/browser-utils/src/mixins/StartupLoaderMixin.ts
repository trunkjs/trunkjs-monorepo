import { ReactiveElement } from 'lit';
import { startupLoaderBridge } from '../lib/startup-loader';

type Constructor<T = object> = abstract new (...args: any[]) => T;

export type StartupLoaderMixinInterface = {
  runLevel: string;
  dependsOn: string[];
};

export function StartupLoaderMixin<TBase extends Constructor<ReactiveElement>>(Base: TBase) {
  abstract class StartupLoaderClass extends Base implements StartupLoaderMixinInterface {
    public runLevel = this.localName;
    public dependsOn: string[] = [];

    #connected = false;
    #started = false;

    override async connectedCallback() {
      this.#connected = true;
      await new Promise<void>((resolve) => {
        startupLoaderBridge.register(
          this,
          { runLevel: this.runLevel, dependsOn: this.dependsOn },
          () => {
            if (this.#connected && !this.#started) {
              this.#started = true;
              super.connectedCallback();
            }
            resolve();
          },
          resolve,
        );
      });
    }

    override firstUpdated(changedProperties: Map<string, unknown>) {
      super.firstUpdated?.(changedProperties);
      startupLoaderBridge.finish(this, 'ready');
    }

    override disconnectedCallback() {
      this.#connected = false;
      startupLoaderBridge.finish(this, 'disconnected');
      if (this.#started) {
        super.disconnectedCallback();
        this.#started = false;
      }
    }
  }
  return StartupLoaderClass as TBase & Constructor<StartupLoaderMixinInterface>;
}

/** @deprecated Use StartupLoaderMixin instead. */
export const LoaderMixin = StartupLoaderMixin;
