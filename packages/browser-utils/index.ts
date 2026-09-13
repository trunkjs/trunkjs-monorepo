export * from './src/lib/breakpoints';
export * from './src/lib/create-element';
export * from './src/lib/Debouncer';
export * from './src/lib/FormDataAccessor';
export * from './src/lib/get-error-location';
export * from './src/lib/Logger';
export * from './src/lib/Stopwatch';
export * from './src/lib/storage';
export * from './src/lib/wait-for';
export * from './src/mixins/BreakPointMixin';
export * from './src/mixins/EventBindingsMixin';
export * from './src/mixins/LoggingMixin';
export * from './src/mixins/LoaderMixin';
export * from './src/mixins/SlotVisibilityMixin';

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
