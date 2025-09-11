type Ctor<T = object> = new (...args: any[]) => T;
type TargetSpec = 'host' | 'document' | 'window' | 'shadowRoot' | EventTarget | ((host: HTMLElement) => EventTarget);
type ListenOpts = { target?: TargetSpec; options?: AddEventListenerOptions };
type ListenerDef = { method: string; events: string[]; opts?: ListenOpts };

const LISTENER_DEFS = Symbol('listenerDefs');
const MIXIN_FLAG = Symbol('withEventBindings');

type EventName = keyof DocumentEventMap;
type OneOrMany<N extends EventName> = N | readonly N[];

type EventFromInput<I extends OneOrMany<EventName>> = I extends readonly (infer K)[]
  ? K extends EventName
    ? DocumentEventMap[K]
    : never
  : I extends EventName
    ? DocumentEventMap[I]
    : never;

export function Listen<I extends OneOrMany<EventName>>(type: I, opts?: ListenOpts) {
  const evts = (Array.isArray(type) ? type : [type]) as readonly EventName[];

  return function <This, Fn extends (this: This, ev: EventFromInput<I>, ...args: any[]) => any>(
    value: Fn,
    context: ClassMethodDecoratorContext<This, Fn>,
  ) {
    if (context.kind !== 'method') throw new Error('@Listen nur für Methoden');

    context.addInitializer(function (this: This) {
      const ctor = (this as any).constructor as any;
      (ctor[LISTENER_DEFS] ||= [] as ListenerDef[]).push({
        method: context.name,
        events: evts,
        opts,
      });
    });

    return function (this: This, ...args: Parameters<Fn>): ReturnType<Fn> {
      if (!(this as any)[MIXIN_FLAG]) {
        throw new Error('[EventBindings] @Listen - decorator requires EventBindingMixin.');
      }
      return value.apply(this, args);
    } as Fn;
  };
}

function resolveTarget(host: HTMLElement, spec?: TargetSpec): EventTarget {
  if (!spec || spec === 'host') return host;
  if (spec === 'document') return host.ownerDocument ?? document;
  if (spec === 'window') return host.ownerDocument?.defaultView ?? window;
  if (spec === 'shadowRoot') return host.shadowRoot ?? host;
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
