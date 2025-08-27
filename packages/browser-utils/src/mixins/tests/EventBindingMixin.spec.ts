import { describe, expect, it } from 'vitest';
import { EventBindingsMixin, Listen } from '../EventBindingsMixin';

type Handler = (ev: any) => void;

class FakeTarget implements EventTarget {
  private listeners = new Map<string, Set<Handler>>();

  addEventListener(type: string, handler: Handler, options?: AddEventListenerOptions | boolean): void {
    let opts: AddEventListenerOptions | undefined;
    if (typeof options === 'boolean') opts = { capture: options };
    else opts = options;

    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler);

    const sig: AbortSignal | undefined = (opts as any)?.signal;
    if (sig) {
      if (sig.aborted) {
        this.removeEventListener(type, handler, opts);
        return;
      }
      const abortHandler = () => {
        this.removeEventListener(type, handler, opts);
        sig.removeEventListener?.('abort', abortHandler as any);
      };
      sig.addEventListener?.('abort', abortHandler as any);
    }
  }

  removeEventListener(type: string, handler: Handler, _options?: AddEventListenerOptions | boolean): void {
    this.listeners.get(type)?.delete(handler);
  }

  dispatchEvent(event: Event): boolean {
    const type = (event as any).type;
    const set = this.listeners.get(type);
    if (!set) return true;
    const handlers = Array.from(set);
    for (const h of handlers) h(event);
    return true;
  }
}

// Base class that behaves like an EventTarget for host bindings
class HostBase extends FakeTarget {}

describe('EventBindingsMixin', () => {
  it('binds listener to host on connectedCallback and handles events', () => {
    class MyEl extends EventBindingsMixin(HostBase) {
      calls = 0;

      @Listen('click')
      onClick(_ev: any) {
        this.calls++;
      }
    }

    const el = new MyEl();
    el.connectedCallback();

    // Should react to click dispatched on host
    el.dispatchEvent({ type: 'click' } as any);
    expect(el.calls).toBe(1);
  });

  it('unbinds listeners on disconnectedCallback (no reaction after disconnect)', () => {
    class MyEl extends EventBindingsMixin(HostBase) {
      calls = 0;

      @Listen('click')
      onClick(_ev: any) {
        this.calls++;
      }
    }

    const el = new MyEl();
    el.connectedCallback();
    el.disconnectedCallback();

    // After disconnect, listener should be removed via AbortSignal
    el.dispatchEvent({ type: 'click' } as any);
    expect(el.calls).toBe(0);
  });

  it('rebinds without duplicating on repeated connectedCallback calls', () => {
    class MyEl extends EventBindingsMixin(HostBase) {
      calls = 0;

      @Listen('click')
      onClick(_ev: any) {
        this.calls++;
      }
    }

    const el = new MyEl();
    el.connectedCallback();
    // Reconnect (e.g., re-attached to DOM) -> should abort old and bind fresh once
    el.connectedCallback();

    el.dispatchEvent({ type: 'click' } as any);
    expect(el.calls).toBe(1); // Not 2
  });

  it('supports binding to a custom target function (not the host)', () => {
    class MyEl extends EventBindingsMixin(HostBase) {
      customTarget = new FakeTarget();
      calls = 0;
      hostCalls = 0;

      @Listen('input', { target: (host) => (host as any as MyEl).customTarget })
      onInput(_ev: any) {
        this.calls++;
      }

      @Listen('input') // bound to host
      onHostInput(_ev: any) {
        this.hostCalls++;
      }
    }

    const el = new MyEl();
    el.connectedCallback();

    // Dispatching on host should increment hostCalls only
    el.dispatchEvent({ type: 'input' } as any);
    expect(el.hostCalls).toBe(1);
    expect(el.calls).toBe(0);

    // Dispatching on custom target should increment calls only
    el.customTarget.dispatchEvent({ type: 'input' } as any);
    expect(el.calls).toBe(1);
    expect(el.hostCalls).toBe(1);

    // After disconnect, no more increments on custom target
    el.disconnectedCallback();
    el.customTarget.dispatchEvent({ type: 'input' } as any);
    expect(el.calls).toBe(1);
  });

  it('binds multiple events when an array is provided', () => {
    class MultiEl extends EventBindingsMixin(HostBase) {
      calls = 0;

      @Listen(['focus', 'blur'])
      onFocusBlur(_ev: any) {
        this.calls++;
      }
    }

    const el = new MultiEl();
    el.connectedCallback();

    el.dispatchEvent({ type: 'focus' } as any);
    el.dispatchEvent({ type: 'blur' } as any);
    expect(el.calls).toBe(2);

    el.disconnectedCallback();
    el.dispatchEvent({ type: 'focus' } as any);
    expect(el.calls).toBe(2);
  });

  it('throws when using @Listen without applying EventBindingsMixin', () => {
    class NoMixin extends HostBase {
      @Listen('click')
      onClick(_ev: any) {
        // no-op
      }
    }

    const el = new NoMixin();
    // Calling the decorated method directly should throw due to missing mixin flag
    expect(() => (el as any).onClick({ type: 'click' })).toThrow(
      '[EventBindings] @Listen - decorator requires EventBindingMixin.',
    );
  });
});
