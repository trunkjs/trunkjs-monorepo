export type Constructor<T = any> = new (...args: any[]) => T;

export type HttpMethod = string | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | 'TRACE';

export function isConstructor(value: any): value is Constructor {
  return typeof value === 'function' && value.prototype && value.prototype.constructor === value;
}

export type MethodMeta = {
  context?: DecoratorContext;
  method?: HttpMethod[];
  path: string;
  name: string;
  middlewares?: Function[];
};
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const METHOD_META = new WeakMap<Function, MethodMeta>();

export function getOrCreateMethodMeta(ctor: Function): MethodMeta {
  let meta = METHOD_META.get(ctor);
  if (!meta) {
    meta = {
      path: '',
      name: '',
      middlewares: [],
    };
    METHOD_META.set(ctor, meta);
  }
  return meta;
}

export type ControllerDef = {
  context?: DecoratorContext;
  base?: string;
  name?: string;
  constructor?: Function;
  parent?: Constructor;
  methods?: Function[];
};
const CLASS_META = new WeakMap<Function, ControllerDef>();
export function getOrCreateControllerMeta(ctor: Function): ControllerDef {
  let meta = CLASS_META.get(ctor);
  if (!meta) {
    const parentClass = Object.getPrototypeOf(ctor);
    meta = { base: '', name: ctor.name, constructor: ctor, parent: parentClass, methods: [] };
    if (parentClass && isConstructor(parentClass)) {
      getOrCreateControllerMeta(parentClass); // Create
    }

    CLASS_META.set(ctor, meta);
  }
  return meta;
}

export function getControllerNamePrefix(ctor?: Function): string[] {
  if (!ctor) return [];
  const meta = getOrCreateControllerMeta(ctor);
  const current = getControllerNamePrefix(meta.parent);
  if (meta.name) current.push(meta.name);
  return current;
}

export function getControllerBasePath(ctor?: Function): string[] {
  if (!ctor) return [];
  const meta = getOrCreateControllerMeta(ctor);
  const current = getControllerBasePath(meta.parent);
  if (meta.base) current.push(meta.base);
  return current;
}
