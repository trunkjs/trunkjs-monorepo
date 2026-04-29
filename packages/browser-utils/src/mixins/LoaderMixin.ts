import {LitElement} from "lit";
import {LoggerMixinInterface} from "./LoggingMixin";


type Constructor<T = object> = abstract new (...args: any[]) => T;

export interface LoaderMixinInterface {
}

export function LoaderMixin<TBase extends Constructor<LitElement>>(Base: TBase) {
  abstract class LoaderClass extends Base implements LoaderMixinInterface {



    override connectedCallback() {
      this.dispatchEvent(new CustomEvent('init:child-waitreq', {
        detail: {
          element: this,
          state: 'connected',
        },
        bubbles: true,
        composed: true,
      }));
      // @ts-ignore
      super.connectedCallback();

    }

    override firstUpdated(changedProperties: Map<string, unknown>) {
      super.firstUpdated?.(changedProperties);
      this.dispatchEvent(new CustomEvent('init:child-ready', {
        detail: {
          element: this,
          state: 'ready',
        },
        bubbles: true,
        composed: true,
      }));
    }

    override disconnectedCallback() {
      super.disconnectedCallback();
      this.dispatchEvent(new CustomEvent('init:child-ready', {
        detail: {
          element: this,
          state: 'disconnected',
        },
        bubbles: true,
        composed: true,
      }));
       // @ts-ignore

    }
  }
  return LoaderClass as TBase & Constructor<LoaderMixinInterface>;
}
