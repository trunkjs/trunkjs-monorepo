type Ctor<T = object> = abstract new (...args: any[]) => T;
type TargetSpec = 'host' | 'document' | 'window' | 'shadowRoot' | EventTarget | ((host: HTMLElement) => EventTarget);
type ListenOpts = { target?: TargetSpec; options?: AddEventListenerOptions };
type OnOpts = { target?: TargetSpec; options?: Omit<AddEventListenerOptions, 'signal'> };
type ListenerDef = { method: PropertyKey; events: string[]; opts?: ListenOpts };
type CallbackDef = {
  type: string;
  callback: EventListenerOrEventListenerObject;
  opts?: OnOpts;
  target?: EventTarget;
};

const LISTENER_DEFS = Symbol('listenerDefs');
const LEGACY_LISTENER_DEFS = Symbol('legacyListenerDefs');
const MIXIN_FLAG = Symbol('withEventBindings');

type EventName = keyof DocumentEventMap;
type OneOrMany<N extends EventName> = N | readonly N[];

type EventFromInput<I extends OneOrMany<EventName> | string> = I extends readonly (infer K)[]
  ? K extends EventName
    ? DocumentEventMap[K]
    : Event
  : I extends EventName
    ? DocumentEventMap[I]
    : Event;

export function Listen<I extends OneOrMany<EventName> | string>(type: I, opts?: ListenOpts) {
  const evts = (Array.isArray(type) ? type : [type]) as readonly string[];

  function decorate<This, Fn extends (this: This, ev: EventFromInput<I>, ...args: any[]) => any>(
    value: Fn,
    context: ClassMethodDecoratorContext<This, Fn>,
  ): Fn;
  function decorate(target: object, method: string | symbol, descriptor: PropertyDescriptor): PropertyDescriptor;
  function decorate(valueOrTarget: any, contextOrMethod: any, descriptor?: PropertyDescriptor): any {
    if (descriptor) {
      const target = valueOrTarget;
      const value = descriptor.value;
      if (typeof value !== 'function') throw new Error('@Listen nur für Methoden');
      if (!Object.prototype.hasOwnProperty.call(target, LEGACY_LISTENER_DEFS)) {
        target[LEGACY_LISTENER_DEFS] = [] as ListenerDef[];
      }
      target[LEGACY_LISTENER_DEFS].push({ method: contextOrMethod, events: [...evts], opts });
      descriptor.value = guarded(value);
      return descriptor;
    }

    const value = valueOrTarget;
    const context = contextOrMethod as ClassMethodDecoratorContext;
    if (context.kind !== 'method') throw new Error('@Listen nur für Methoden');
    context.addInitializer(function (this: any) {
      if (!Object.prototype.hasOwnProperty.call(this, LISTENER_DEFS)) this[LISTENER_DEFS] = [] as ListenerDef[];
      this[LISTENER_DEFS].push({ method: context.name, events: [...evts], opts });
    });
    return guarded(value);
  }
  return decorate;
}

function guarded<Fn extends (...args: any[]) => any>(value: Fn): Fn {
  return function (this: any, ...args: Parameters<Fn>): ReturnType<Fn> {
    if (!this[MIXIN_FLAG]) {
      throw new Error('[EventBindings] @Listen - decorator requires EventBindingMixin.');
    }
    return value.apply(this, args);
  } as Fn;
}

function resolveTarget(host: HTMLElement, spec?: TargetSpec): EventTarget {
  if (!spec || spec === 'host') return host;
  if (spec === 'document') return host.ownerDocument ?? document;
  if (spec === 'window') return host.ownerDocument?.defaultView ?? window;
  if (spec === 'shadowRoot') return host.shadowRoot ?? host;
  if (typeof spec === 'function') return spec(host);
  return spec;
}

export interface EventBindingsApi {
  /** Keep a listener across reconnections. The returned function permanently unregisters it.
   * The target is resolved on each connection. Register after the target exists when using
   * a callback for an element inside a Lit render root.
   * @example const off = this.on('resize', () => this.requestUpdate(), { target: 'window' });
   */
  on<K extends EventName>(type: K, callback: (event: DocumentEventMap[K]) => void, opts?: OnOpts): () => void;
  on(type: string, callback: EventListenerOrEventListenerObject, opts?: OnOpts): () => void;
}

export function EventBindingsMixin<TBase extends Ctor<object>>(Base: TBase) {
  abstract class EventBindings extends Base implements EventBindingsApi {
    #ac?: AbortController;
    #callbacks = new Set<CallbackDef>();

    constructor(...args: any[]) {
      super(...args);
      (this as any)[MIXIN_FLAG] = true;
    }

    on<K extends EventName>(type: K, callback: (event: DocumentEventMap[K]) => void, opts?: OnOpts): () => void;
    on(type: string, callback: EventListenerOrEventListenerObject, opts?: OnOpts): () => void;
    on(type: string, callback: any, opts?: OnOpts): () => void {
      const entry: CallbackDef = { type, callback, opts };
      this.#callbacks.add(entry);
      if (this.#ac && !this.#ac.signal.aborted) this.#attach(entry);
      return () => {
        if (!this.#callbacks.delete(entry)) return;
        entry.target?.removeEventListener(type, callback, opts?.options?.capture);
        entry.target = undefined;
      };
    }

    connectedCallback() {
      // @ts-ignore base may be a plain HTMLElement
      super.connectedCallback?.();
      this.#bindEventListeners();
    }

    disconnectedCallback() {
      this.#ac?.abort();
      this.#ac = undefined;
      for (const entry of this.#callbacks) entry.target = undefined;
      // @ts-ignore base may be a plain HTMLElement
      super.disconnectedCallback?.();
    }

    #attach(entry: CallbackDef) {
      const target = resolveTarget(this as unknown as HTMLElement, entry.opts?.target);
      target.addEventListener(entry.type, entry.callback, { ...entry.opts?.options, signal: this.#ac!.signal });
      entry.target = target;
    }

    #bindEventListeners() {
      this.#ac?.abort();
      this.#ac = new AbortController();
      const defs: ListenerDef[] = [...((this as any)[LISTENER_DEFS] || [])];
      for (let prototype = Object.getPrototypeOf(this); prototype; prototype = Object.getPrototypeOf(prototype)) {
        if (Object.prototype.hasOwnProperty.call(prototype, LEGACY_LISTENER_DEFS)) {
          defs.push(...prototype[LEGACY_LISTENER_DEFS]);
        }
      }
      for (const def of defs) {
        const target = resolveTarget(this as unknown as HTMLElement, def.opts?.target);
        const handler = (this as any)[def.method].bind(this);
        for (const evt of def.events) {
          target.addEventListener(evt, handler, { ...def.opts?.options, signal: this.#ac.signal });
        }
      }
      for (const entry of this.#callbacks) this.#attach(entry);
    }
  }
  return EventBindings as TBase & Ctor<EventBindingsApi>;
}
