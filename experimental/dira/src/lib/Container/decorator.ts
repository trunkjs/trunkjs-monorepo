import type { Token } from './Container';

const INJECTED_PROPS = new WeakMap<object, Map<string, any>>();

/**
 * Decorator to inject a dependency into a class property.
 * If no token is given, the property name is used as token.
 *
 * Important: This decorator just stores the metadata. Otherwise a direct instantiation of the class would not work.
 * (e.g. for unit testing).
 *
 * Due to the nature of decorators, the metadata will be first available after instantiation of the class.
 *
 * Example:
 *   class Service {
 *     @Inject('logger') private log!: Logger;
 *     @Inject() private config!: Config; // token 'config'
 *   }
 */
export function Inject(token?: Token<any>) {
  return function (_init: unknown, context: ClassFieldDecoratorContext) {
    context.addInitializer(function () {
      const ctor: Function = context.static
        ? (this as any) // static: this === constructor
        : (this as any).constructor; // instance: this.constructor

      let map = INJECTED_PROPS.get(ctor);
      if (!map) INJECTED_PROPS.set(ctor, (map = new Map()));
      map.set(String(context.name), token ?? context.name);
    });
  };
}
/**
 * Returns a map of propertyName -> token for an instance based on its prototype chain.
 * Properties defined lower in the prototype chain take precedence.
 */
export function getInjectedProperties(instance: any): Map<string, string> {
  const result = new Map<string, string>();
  let proto = Object.getPrototypeOf(instance);
  while (proto && proto !== Object.prototype) {
    const current = INJECTED_PROPS.get(proto);
    if (current) {
      for (const [prop, tok] of current.entries()) {
        if (!result.has(prop)) {
          result.set(prop, tok);
        }
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return result;
}
