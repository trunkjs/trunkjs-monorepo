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

/**
 * Waits for the load event of the given element or the window if no element is provided.
 *
 * Hanles:
 * - Window: waits for 'load' event if not already loaded
 * - HTMLImageElement: waits for 'load' event if not already complete
 * - HTMLVideoElement and HTMLAudioElement: waits for 'loadeddata' event if not
 *
 *
 * @param element
 */
export function waitForLoad(element: HTMLElement | Window | null = null): Promise<void> {
  if (!element) {
    element = window;
  }
  if (element instanceof Window) {
    if (document.readyState === 'complete') {
      return Promise.resolve();
    }
  } else if (element instanceof HTMLImageElement) {
    if (element.complete) {
      return Promise.resolve();
    }
  } else if (element instanceof HTMLVideoElement || element instanceof HTMLAudioElement) {
    if (element.readyState >= 3) {
      // HAVE_FUTURE_DATA
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      element.addEventListener('loadeddata', () => resolve(), { once: true });
    });
  }

  return new Promise((resolve) => {
    element.addEventListener('load', () => resolve());
  });
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
