// Function to return promise on a dedicated event

export function waitFor<T>(target: EventTarget, eventName: string, options?: AddEventListenerOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (event: Event) => {
      target.removeEventListener(eventName, handler, options);
      resolve(event as T);
    };
    target.addEventListener(eventName, handler, options);
  });
}

export function waitForDomContentLoaded(): Promise<void> {
  if (document.readyState === 'loading') {
    return new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', () => resolve());
    });
  }
  return Promise.resolve();
}


export function waitForReady() : Promise<void> {
  if ( ! window.tj_loader_state)
    return waitForLoad(); // No Loader Component detected, fallback to waiting for window load event

  if (window.tj_loader_state !== "loading")
    return Promise.resolve();
  return waitFor(window, 'loader:ready');
}


/**
 * Wait for Loader firing the pre-visual (Elements are visual but might be in animation to show up)
 */
export function waitForPreVisual() : Promise<void> {
  if ( ! window.tj_loader_state)
    return waitForLoad(); // No Loader Component detected, fallback to waiting for window load event

  if (window.tj_loader_state === "pre-visual" || window.tj_loader_state === "visual")
    return Promise.resolve();
  return waitFor(window, 'loader:pre-visual');
}
/**
 * Wait for Loader firing visual (the elements are fully visual to the user)
 */
export function waitForVisual() : Promise<void> {
  if ( ! window.tj_loader_state)
    return waitForLoad(); // No Loader Component detected, fallback to waiting for window load event

  if (window.tj_loader_state === "visual")
    return Promise.resolve();
  return waitFor(window, 'loader:visual');
}


/**
 * Waits for the load event of the given element or the window if no element is provided.
 *
 * Hanles:
 * - Window: waits for 'load' event if not already loaded
 * - HTMLImageElement: waits for 'load' event if not already complete
 * - HTMLVideoElement and HTMLAudioElement: waits for 'loadeddata' event if not
 *
 *
 * @param el
 */
export function waitForLoad(el: Window | HTMLElement | null = window): Promise<void> {
  if (!el) el = window;

  // Window
  if (el === window) {
    if (document.readyState === 'complete') return Promise.resolve();
    return new Promise<void>((res) => window.addEventListener('load', () => res(), { once: true }));
  }

  // Image
  if (el instanceof HTMLImageElement) {
    if (el.complete && el.naturalWidth !== 0) return Promise.resolve();
    return new Promise<void>((res, rej) => {
      el.addEventListener('load', () => res(), { once: true });
      el.addEventListener('error', () => rej(new Error('image error')), { once: true });
    });
  }

  // Audio/Video
  if (el instanceof HTMLMediaElement) {
    if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve();
    return new Promise<void>((res) => el.addEventListener('loadeddata', () => res(), { once: true }));
  }

  // Fallback
  return new Promise<void>((res) => el.addEventListener('load', () => res(), { once: true }));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function waitForAnimationEnd(element: HTMLElement): Promise<AnimationEvent> {
  return new Promise((resolve) => {
    const handler = (event: AnimationEvent) => {
      element.removeEventListener('animationend', handler);
      resolve(event);
    };
    element.addEventListener('animationend', handler);
  });
}
