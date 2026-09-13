import {
  type EventRegistryInterface,
  type TAnyEventHandler,
  type TConstructor,
  type TEventBindingPatch,
  type TEventMap,
  type TEventMapConstraint,
  type TEventMixinInstance,
  type TEventProxy,
  type TNullableEventHandler,
} from './event-types';

export * from './event-types';

function createEventProxy<TEvents extends TEventMapConstraint, THost extends EventMixinRuntime<TEvents>>(
  host: THost,
): TEventProxy<TEvents, THost> {
  return new Proxy({} as TEventProxy<TEvents, THost>, {
    get(_target, property) {
      if (typeof property !== 'string') {
        return undefined;
      }

      return host.$getEventHandler(property);
    },
    set(_target, property, value) {
      if (typeof property !== 'string') {
        return false;
      }

      host.$setEventHandler(property, value as TNullableEventHandler<readonly unknown[], THost>);
      return true;
    },
    deleteProperty(_target, property) {
      if (typeof property !== 'string') {
        return false;
      }

      host.$setEventHandler(property, undefined);
      return true;
    },
    has(_target, property) {
      return typeof property === 'string' ? host.$getEventHandler(property) != null : false;
    },
  });
}

interface EventMixinRuntime<TEvents extends TEventMapConstraint = TEventMap> {
  $getEventHandler(eventName: string): TAnyEventHandler<this> | undefined;
  $setEventHandler(eventName: string, handler: TNullableEventHandler<readonly unknown[], this>): void;
  defineOn(definitions: TEventBindingPatch<TEvents, this>): void;
}

export class MemoryEventRegistry<TEvents extends TEventMapConstraint = TEventMap, TThis = unknown>
  implements EventRegistryInterface<TEvents, TThis>
{
  readonly #handlers = new Map<string, TAnyEventHandler<TThis>>();

  registerEvent(eventName: string, handler: TAnyEventHandler<TThis>): void {
    this.#handlers.set(eventName, handler);
  }

  unregisterEvent(eventName: string): void {
    this.#handlers.delete(eventName);
  }

  triggerEvent(eventName: string, ...args: readonly unknown[]): void {
    const handler = this.#handlers.get(eventName);
    if (!handler) {
      return;
    }

    handler.apply(undefined as unknown as TThis, [...args]);
  }
}

export function bindToOnEvent<TEventName extends string>(eventName: TEventName) {
  return function <
    TThis extends {
      defineOn(definitions: any): void;
    },
    TValue extends ((...args: any[]) => void) | null | undefined,
  >(
    target: ClassAccessorDecoratorTarget<TThis, TValue>,
    context: ClassAccessorDecoratorContext<TThis, TValue>,
  ): ClassAccessorDecoratorResult<TThis, TValue> {
    if (context.kind !== 'accessor') {
      throw new Error('[EventMixin] @bindToOnEvent can only be used on accessors.');
    }

    const syncToOn = function (this: TThis, value: TValue) {
      if (typeof this.defineOn !== 'function') {
        throw new Error('[EventMixin] @bindToOnEvent - decorator requires EventMixin.');
      }

      this.defineOn({
        [eventName]: value as TNullableEventHandler<readonly unknown[], TThis>,
      } as TEventBindingPatch<TEventMap, TThis>);
    };

    context.addInitializer(function (this: TThis) {
      const initialValue = (this as unknown as Record<PropertyKey, TValue>)[context.name];
      if (initialValue != null) {
        syncToOn.call(this, initialValue);
      }
    });

    return {
      set(this: TThis, value: TValue) {
        target.set.call(this, value);
        syncToOn.call(this, value);
      },
    };
  };
}

export const bindToOnEvnet = bindToOnEvent;

export function EventMixin<TBase extends TConstructor, TEvents extends TEventMapConstraint = TEventMap>(
  Base: TBase,
  registry: EventRegistryInterface<TEvents, TEventMixinInstance<TBase, TEvents>>,
) {
  abstract class EventMixinClass extends Base implements EventMixinRuntime<TEvents> {
    readonly #rawHandlers = new Map<string, TAnyEventHandler<this>>();
    readonly #boundHandlers = new Map<string, TAnyEventHandler<TEventMixinInstance<TBase, TEvents>>>();

    readonly $on = createEventProxy<TEvents, this>(this);

    defineOn(definitions: TEventBindingPatch<TEvents, this>): void {
      for (const [eventName, handler] of Object.entries(definitions)) {
        this.$setEventHandler(eventName, handler);
      }
    }

    $emit<K extends keyof TEvents & string>(eventName: K, ...args: TEvents[K]): void;
    $emit(eventName: string, ...args: readonly unknown[]): void;
    $emit(eventName: string, ...args: readonly unknown[]): void {
      registry.triggerEvent(eventName, ...args);
    }

    $getEventHandler(eventName: string): TAnyEventHandler<this> | undefined {
      return this.#rawHandlers.get(eventName);
    }

    $setEventHandler(eventName: string, handler: TNullableEventHandler<readonly unknown[], this>): void {
      const currentBoundHandler = this.#boundHandlers.get(eventName);
      if (currentBoundHandler) {
        registry.unregisterEvent(eventName);
        this.#boundHandlers.delete(eventName);
      }

      if (handler == null) {
        this.#rawHandlers.delete(eventName);
        return;
      }

      this.#rawHandlers.set(eventName, handler as TAnyEventHandler<this>);

      const boundHandler: TAnyEventHandler<TEventMixinInstance<TBase, TEvents>> = ((...args: readonly unknown[]) => {
        handler.apply(this, [...args]);
      }) as TAnyEventHandler<TEventMixinInstance<TBase, TEvents>>;

      this.#boundHandlers.set(eventName, boundHandler);
      registry.registerEvent(eventName, boundHandler);
    }
  }

  return EventMixinClass as TBase & TConstructor<TEventMixinInstance<TBase, TEvents>>;
}
