import type { Token } from './Container';

const INJECTED_PROPS = new WeakMap<object, Map<string, any>>();

/**
 * Decorator to inject a dependency into a class property.
 * If no token is given, the property name is used as token.
 *
 * Example:
 *   class Service {
 *     @Inject('logger') private log!: Logger;
 *     @Inject() private config!: Config; // token 'config'
 *   }
 */
export function Inject(token?: Token<any>) {
  // property decorator
  return function (target: any, propertyKey: string) {
    const proto = target;
    let map = INJECTED_PROPS.get(proto);
    if (!map) {
      map = new Map<string, string>();
      INJECTED_PROPS.set(proto, map);
    }
    map.set(propertyKey, token ?? propertyKey);
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
