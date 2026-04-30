export * from './lib/breakpoints';
export * from './lib/create-element';
export * from './lib/Debouncer';
export * from './lib/get-error-location';
export * from './lib/Logger';
export * from './lib/Stopwatch';
export * from './lib/storage';
export * from './lib/wait-for';
export * from './mixins/BreakPointMixin';
export * from './mixins/EventBindingsMixin';
export * from './mixins/LoggingMixin';
export * from './mixins/LoaderMixin';
export * from './mixins/SlotVisibilityMixin';

export type ElementSpec = {
  element: HTMLElement
  state: 'wait' | 'ready'
}


/**
 * THIS IS A COPY of the Loader events
 */
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