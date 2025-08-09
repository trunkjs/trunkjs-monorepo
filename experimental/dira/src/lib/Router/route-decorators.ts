import {
  getControllerBasePath,
  getControllerNamePrefix,
  getOrCreateControllerMeta,
  getOrCreateMethodMeta,
  HttpMethod,
  isConstructor,
} from './metadata';

// Methodendekorator
export function Route(cfg: {
  method: HttpMethod | HttpMethod[];
  path?: string | null;
  routeName?: string;
  middleware?: Function | Function[];
}) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (value: Function, ctx: ClassMethodDecoratorContext) => {
    console.log('Route decorator called', value, ctx);
    if (!cfg.path) cfg.path = String(ctx.name); // Default: Name der Methode
    if (!cfg.routeName) cfg.routeName = String(ctx.name); // Default: Name der Methode
    const meta = getOrCreateMethodMeta(value);
    meta.context = ctx;
    meta.method = Array.isArray(cfg.method) ? cfg.method : [cfg.method];
    meta.path = cfg.path;
    meta.name = cfg.routeName ?? String(ctx.name); // Default: Name der Methode
    meta.middlewares = Array.isArray(cfg.middleware) ? cfg.middleware : cfg.middleware ? [cfg.middleware] : [];
  };
}

// Klassendekorator sammelt + defaultet
export function Controller(cfg: { base: string; name?: string }) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (ctor: Function, _ctx: ClassDecoratorContext) => {
    if (!isConstructor(ctor)) {
      throw new Error('Controller decorator can only be applied to classes');
    }
    const meta = getOrCreateControllerMeta(ctor);
    meta.context = _ctx;
    meta.base = cfg.base;
    meta.name = cfg.name ?? ctor.name; // Default: Name der Klasse
    meta.constructor = ctor;

    // Register all
  };
}

function getOwnMethods(proto: object): Function[] {
  return Object.getOwnPropertyNames(proto)
    .filter((name) => name !== 'constructor')
    .map((name) => (proto as any)[name])
    .filter((v) => typeof v === 'function');
}

export type RouteDef = {
  methodContext?: DecoratorContext;
  classContext?: DecoratorContext;
  method: HttpMethod[];
  route: string;
  name: string;
  middlewares: Function[];
  class?: Function;
  fn: Function;
};

export function getRoutes(ctor: Function): RouteDef[] {
  const ctrlMeta = getOrCreateControllerMeta(ctor);

  const methods = getOwnMethods(ctor.prototype);

  const routes: RouteDef[] = [];
  for (const method of methods) {
    const meta = getOrCreateMethodMeta(method);
    if (!meta) continue; // No route metadata, skip

    if (!meta.method || meta.method.length === 0) {
      continue; // No method defined, skip
    }
    const route: RouteDef = {
      methodContext: meta.context,
      classContext: ctrlMeta.context,
      method: meta.method,
      route: getControllerBasePath(ctor).concat(meta.path).join('/'),
      name: getControllerNamePrefix(ctor).concat(meta.name).join('.'),
      middlewares: meta.middlewares ?? [],
      class: ctrlMeta.constructor,
      fn: method,
    };
    routes.push(route);
  }

  return routes;
}
