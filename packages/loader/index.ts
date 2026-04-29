export * from './src/components/tj-loader/loader';

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


    'loader:visible': CustomEvent<void>;
    'loader:ready': CustomEvent<void>;
  }
  interface Window {
    /**
     * Flag to indicate that the loader component is active and that custom elements should wait for the
     * loader events before initializing. This is used to prevent
     */
    tj_loader_state: "loading" | "ready";
  }
}