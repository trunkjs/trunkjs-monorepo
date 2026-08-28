export type TConstructor<T = object> = abstract new (...args: any[]) => T;

export type TEventMapConstraint = Record<string, readonly unknown[]>;

export type TEventMap = {
  [K in keyof GlobalEventHandlersEventMap]: [event: GlobalEventHandlersEventMap[K]];
} & {
  [K in keyof HTMLElementEventMap]: [event: HTMLElementEventMap[K]];
};

export type TEventHandler<TArgs extends readonly unknown[] = readonly unknown[], TThis = unknown> = (
  this: TThis,
  ...args: TArgs
) => void;

export type TAnyEventHandler<TThis = unknown> = TEventHandler<readonly unknown[], TThis>;

export type TNullableEventHandler<TArgs extends readonly unknown[] = readonly unknown[], TThis = unknown> =
  | TEventHandler<TArgs, TThis>
  | null
  | undefined;

export type TDynamicEventHandlers<TThis = unknown> = {
  [eventName: string]: TNullableEventHandler<readonly unknown[], TThis>;
};

export type TEventBindingPatch<TEvents extends TEventMapConstraint = TEventMap, TThis = unknown> = Partial<{
  [K in keyof TEvents]: TNullableEventHandler<TEvents[K], TThis>;
}> &
  TDynamicEventHandlers<TThis>;

export type TEventProxy<TEvents extends TEventMapConstraint = TEventMap, TThis = unknown> = {
  [K in keyof TEvents]: TNullableEventHandler<TEvents[K], TThis>;
} & TDynamicEventHandlers<TThis>;

export interface EventRegistryInterface<TEvents extends TEventMapConstraint = TEventMap, TThis = unknown> {
  registerEvent(eventName: string, handler: TAnyEventHandler<TThis>): void;

  unregisterEvent(eventName: string): void;

  triggerEvent(eventName: string, ...args: readonly unknown[]): void;
}

export type TEventHost<TEvents extends TEventMapConstraint = TEventMap, TThis = unknown> = {
  readonly $on: TEventProxy<TEvents, TThis>;
  defineOn(definitions: TEventBindingPatch<TEvents, TThis>): void;
  $emit<K extends keyof TEvents & string>(eventName: K, ...args: TEvents[K]): void;
  $emit(eventName: string, ...args: readonly unknown[]): void;
};

export type TEventMixinInstance<TBase extends TConstructor, TEvents extends TEventMapConstraint> = InstanceType<TBase> &
  TEventHost<TEvents, InstanceType<TBase>>;
