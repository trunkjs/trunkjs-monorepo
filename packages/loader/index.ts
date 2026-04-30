export * from './src/components/tj-loader/loader';
import {tj_loader_state_internal} from './src/lib/tj-loader-state';





Object.assign(window, {
  get tj_loader_state() {
    return tj_loader_state_internal.state;
  },
  set tj_loader_state(value: any) {
    throw new Error(`Cannot set tj_loader_state directly.`);
  }
})


export type ElementSpec = {
  element: HTMLElement
  state: 'wait' | 'ready'
}
declare global {
  interface CustomEventMap {
    /**
     * Event to be fired from HtmlElement on connectedCallback to indicate to the loader to wait for a element
     */
    'init:child-waitreq': CustomEvent<ElementSpec>;

    /**
     * Event to be fired from HtmlElement after the element is fully initialized and ready.
     */
    'init:child-ready': CustomEvent<ElementSpec>;


    /**
     * Fired as soon as all Elements are ready and displayed but not visual yet (visability: hidden). This can be used to perform any last minute adjustments before the loader is hidden and the content is visible.
     */
    'loader:ready': CustomEvent<void>;


    /**
     * Fired when the loader is hidden and the content is visible but before blend animation. This can be used to perform any actions that should only be performed when the content is visible, such as starting animations or loading additional resources.
     */
    'loader:pre-visual': CustomEvent<void>;

    /**
     * Fired when the content is fully visible to the user. This can be used to perform any actions that should only be performed when the content is visible, such as starting animations or loading additional resources.
     */
    'loader:visual': CustomEvent<void>;
  }
  interface Window {
    /**
     * Flag to indicate that the loader component is active and that custom elements should wait for the
     * loader events before initializing. This is used to prevent
     */
    tj_loader_state: "loading" | "ready" | "pre-visual" | "visual";
  }
}