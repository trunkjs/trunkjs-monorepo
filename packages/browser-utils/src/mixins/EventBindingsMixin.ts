type Ctor<T = object> = new (...args: any[]) => T;
type TargetSpec = 'host' | 'document' | 'window' | EventTarget | ((host: HTMLElement) => EventTarget);
type ListenOpts = { target?: TargetSpec; options?: AddEventListenerOptions };
type ListenerDef = { method: string; events: string[]; opts?: ListenOpts };

const LISTENER_DEFS = Symbol('listenerDefs');
const MIXIN_FLAG = Symbol('withEventBindings');

/**
 * Decorator to listen to events on the host or other targets.
 * (ES Decorator - cannot be used with legacy decorators)
 *
 *
 * @param events
 * @param opts
 * @constructor
 */
export function Listen(events: string | string[], opts?: ListenOpts) {
  const evts = Array.isArray(events) ? events : [events];
  return function (value: (this: unknown, ...args: any[]) => any, context: ClassMethodDecoratorContext) {
    if (context.kind !== 'method') throw new Error('@Listen nur für Methoden');

    context.addInitializer(function (this: any) {
      const ctor = this.constructor as any;
      (ctor[LISTENER_DEFS] ||= [] as ListenerDef[]).push({
        method: context.name,
        events: evts,
        opts,
      });
    });

    // Guard + Invoke
    return function (this: any, ...args: any[]) {
      if (!this[MIXIN_FLAG]) {
        throw new Error('[WithEventBindings] @Listen ohne Mixin verwendet.');
      }
      return value.apply(this, args);
    };
  };
}

function resolveTarget(host: HTMLElement, spec?: TargetSpec): EventTarget {
  if (!spec || spec === 'host') return host;
  if (spec === 'document') return host.ownerDocument ?? document;
  if (spec === 'window') return host.ownerDocument?.defaultView ?? window;
  if (typeof spec === 'function') return spec(host);
  return spec;
}
export function EventBindingsMixin<TBase extends Ctor<object>>(Base: TBase) {
  abstract class EventBindings extends Base {
    #ac?: AbortController;

    constructor(...a: any[]) {
      super(...a);
      (this as any)[MIXIN_FLAG] = true; // aktiviert Guard
    }

    connectedCallback() {
      // @ts-ignore
      super.connectedCallback?.();
      this.#bindEventListeners();
    }

    disconnectedCallback() {
      this.#ac?.abort();
      // @ts-ignore
      super.disconnectedCallback?.();
    }

    #bindEventListeners() {
      this.#ac?.abort();
      this.#ac = new AbortController();
      const defs: ListenerDef[] = (this.constructor as any)[LISTENER_DEFS] || [];
      for (const def of defs) {
        const target = resolveTarget(this as any, def.opts?.target);
        const baseOpts = def.opts?.options ?? {};
        const handler = (this as any)[def.method].bind(this);
        for (const evt of def.events) {
          target.addEventListener(evt, handler, { ...baseOpts, signal: this.#ac.signal });
        }
      }
    }
  }
  return EventBindings;
}
