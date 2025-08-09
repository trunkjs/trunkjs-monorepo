---
slugName: implement-route-decorators
includeFiles:
    - ./src/lib/Router/route-decorators.ts
    - ./src/lib/Container/Container.ts
    - ./src/lib/Router/route-decorators.spec.ts
editFiles:
    - ./src/lib/Router/route-decorators.ts
    - ./src/lib/Router/route-decorators.spec.ts
original_prompt: implement the Route Decorators following the base syntax and description
    provided in route-decorators.ts
---

# Prepare Implement Route Decorators

Implement the routing decorators and metadata extraction as described in src/lib/Router/route-decorators.ts. Provide class- and method-level decorators, HTTP verb decorators, and a function to collect resolved route definitions from a class or instance.

## Assumptions

- Decorator usage:
    - serverRoute can be applied to classes and methods. Standalone function decorators are not supported by TypeScript; we will not implement function-level decorators.
    - HTTP method decorators (Get, Post, Put, Delete) are method decorators without parameters and will use the method name as the default path if no @serverRoute is applied on the method.
- Method-level serverRoute without HTTP method decorator will default to method GET.
- Path handling rules:
    - Class-level serverRoute defines a base path. It must be an absolute path (starting with “/”). We will normalize trailing slashes.
    - When a class has a @serverRoute and a method has a @serverRoute, the method path must start with “./” and will be appended to the class base path. If it does not start with “./”, an error will be thrown.
    - If a method only has an HTTP method decorator (no method-level serverRoute), the full path is composed of base path + “/” + method name.
    - If there is no class serverRoute, a method-level serverRoute path can be absolute (“/x”) or relative (“./x”), which will be normalized to an absolute path.
- getServerRoutes will accept either a class constructor or an instance and return the resolved list of routes for that target only, not a global registry.
- Middleware order is class-level first, then method-level.

If any of these assumptions should be different, please clarify:

- Should method-level serverRoute without HTTP decorator default to GET, ALL, or be considered invalid?
- Should absolute method-level paths be allowed to override the class base path even if the class has a serverRoute (current implementation forbids it as per the description)?
- Should we include inherited routes from parent classes?

## Tasks

- Implement serverRoute decorator Implement as class and method decorator. Handle path composition and middleware aggregation.
- Implement HTTP method decorators Implement Get, Post, Put, Delete, and Method(httpMethod) as method decorators.
- Implement getServerRoutes Implement function that returns resolved routes for a given class or instance.
- Add unit tests Minimal tests covering base usage, middleware composition, path rules, and error case.

## Overview: File changes

- ./src/lib/Router/route-decorators.ts Implement decorators, routing metadata store, types, and getServerRoutes export.
- ./src/lib/Router/route-decorators.spec.ts Add unit tests for decorator behavior and route extraction.

## Detail changes

### ./src/lib/Router/route-decorators.ts

Referenced Tasks

- Implement serverRoute decorator Implement as class and method decorator. Handle path composition and middleware aggregation.
- Implement HTTP method decorators Implement Get, Post, Put, Delete, and Method(httpMethod) as method decorators.
- Implement getServerRoutes Implement function that returns resolved routes for a given class or instance.

Replace entire content with:

```
/* eslint-disable @typescript-eslint/ban-types */

type HttpMethod = string;

export type ServerRoute = {
  route: string;
  method: string;
  middlewares: any[];
  handler: Function;
  object?: any;
};

type MethodMeta = {
  handlerName: string;
  httpMethod?: HttpMethod;
  path?: string;
  middlewares: any[];
};

type ClassMeta = {
  basePath: string;
  middlewares: any[];
};

type RouteMetaState = {
  classMeta?: ClassMeta;
  methods: Map<string, MethodMeta>;
};

const routingMap: WeakMap<object, RouteMetaState> = new WeakMap();

/**
 * Utilities
 */
function isConstructor(x: any): x is Function {
  return typeof x === 'function';
}

function getProtoKey(target: any): object {
  // For class decorator, target is constructor (function).
  // For method decorator, target is the prototype object.
  if (isConstructor(target)) return target.prototype;
  return target;
}

function getStateFor(target: any): RouteMetaState {
  const key = getProtoKey(target);
  let st = routingMap.get(key);
  if (!st) {
    st = { methods: new Map() };
    routingMap.set(key, st);
  }
  return st;
}

function normalizeBasePath(p: string): string {
  if (!p) return '/';
  // Remove starting './' if provided accidentally
  let path = p.replace(/^\.\/+/, '');
  if (!path.startsWith('/')) path = '/' + path;
  // Remove trailing slash except root
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path;
}

function joinPaths(a: string, b: string): string {
  const aClean = a.replace(/\/+$/, '');
  const bClean = b.replace(/^\/+/, '');
  const res = `${aClean}/${bClean}`;
  return res.replace(/\/+/g, '/');
}

/**
 * HTTP method decorators
 */
export function Method(httpMethod: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const st = getStateFor(target);
    const name = String(propertyKey);
    const meta = st.methods.get(name) ?? { handlerName: name, middlewares: [] as any[] };
    meta.httpMethod = (httpMethod || 'GET').toUpperCase();
    st.methods.set(name, meta);
  };
}

export function Get(): MethodDecorator {
  return Method('GET');
}
export function Post(): MethodDecorator {
  return Method('POST');
}
export function Put(): MethodDecorator {
  return Method('PUT');
}
export function Delete(): MethodDecorator {
  return Method('DELETE');
}

/**
 * Decorator to define on a class or a method that will be used as a server route.
 *
 * If used by a class it will define the root path for all methods below and define the middlewares for all
 * methods in the class.
 *
 * Dedicated method server routes can be defined using the `@Post`, `@Get`, `@Put`, `@Delete` decorators and take
 * the method name as the route path.
 *
 * If serverRoute is used on a method and the class has already a serverRoute defined, the method will require
 * the route to start with a ./ and the class route will be used as a prefix.
 *
 * @param path Path string
 * @param middleware Middlewares to attach; class-level applies to all, method-level appended after class middlewares
 */
export function serverRoute(path: string, middleware: any[] = []): ClassDecorator & MethodDecorator {
  return function (target: any, propertyKey?: string | symbol, _descriptor?: PropertyDescriptor) {
    // Class decorator
    if (typeof propertyKey === 'undefined') {
      const st = getStateFor(target);
      st.classMeta = {
        basePath: normalizeBasePath(path),
        middlewares: Array.isArray(middleware) ? middleware : [middleware],
      };
      return;
    }

    // Method decorator
    const st = getStateFor(target);
    const name = String(propertyKey);
    const meta = st.methods.get(name) ?? { handlerName: name, middlewares: [] as any[] };
    meta.path = path;
    meta.middlewares = [...(meta.middlewares || []), ...(Array.isArray(middleware) ? middleware : [middleware])];
    st.methods.set(name, meta);
  } as any;
}

/**
 * Resolve route definitions for a given class (constructor) or instance.
 */
export function getServerRoutes(targetOrInstance: any): ServerRoute[] {
  const proto = isConstructor(targetOrInstance)
    ? targetOrInstance.prototype
    : Object.getPrototypeOf(targetOrInstance);

  const st = routingMap.get(proto);
  if (!st) return [];

  const classMeta = st.classMeta;
  const basePath = classMeta?.basePath || '';
  const baseMiddlewares = classMeta?.middlewares || [];

  const routes: ServerRoute[] = [];

  for (const [name, m] of st.methods.entries()) {
    const httpMethod = (m.httpMethod || 'GET').toUpperCase();

    let routePath: string;

    if (m.path != null) {
      const p = m.path;

      if (classMeta) {
        // When class has a base route, method @serverRoute must start with './'
        if (!p.startsWith('./')) {
          if (p.startsWith('/')) {
            throw new Error(
              `Method "${name}" route "${p}" must start with "./" when class has @serverRoute("${basePath}")`
            );
          } else {
            throw new Error(
              `Method "${name}" route "${p}" must start with "./" when class has @serverRoute("${basePath}")`
            );
          }
        }
        routePath = joinPaths(basePath, p.slice(2));
      } else {
        // No class base route
        if (p.startsWith('./')) {
          routePath = '/' + p.slice(2);
        } else if (p.startsWith('/')) {
          routePath = p;
        } else {
          routePath = '/' + p;
        }
      }
    } else {
      // No explicit method path: default to method name
      routePath = basePath ? joinPaths(basePath, name) : '/' + name;
    }

    const middlewares = [...baseMiddlewares, ...(m.middlewares || [])];

    let handler: Function;
    let object: any | undefined = undefined;

    if (isConstructor(targetOrInstance)) {
      handler = (proto as any)[name];
    } else {
      object = targetOrInstance;
      handler = targetOrInstance[name].bind(targetOrInstance);
    }

    routes.push({
      route: routePath,
      method: httpMethod,
      middlewares,
      handler,
      object,
    });
  }

  return routes;
}
```

### ./src/lib/Router/route-decorators.spec.ts

Referenced Tasks

- Add unit tests Minimal tests covering base usage, middleware composition, path rules, and error case.

Create this file with the following content:

```
import { describe, it, expect } from 'vitest';
import { serverRoute, Get, Post, Method, getServerRoutes } from './route-decorators';

describe('route-decorators', () => {
  it('composes class base path with GET method default path (method name)', () => {
    class UsersController {
      list() {}
    }

    // Apply decorators manually to avoid TS experimentalDecorators requirement in tests
    serverRoute('/users', ['mw-class'])(UsersController);
    Get()(UsersController.prototype, 'list', Object.getOwnPropertyDescriptor(UsersController.prototype, 'list')!);

    const routes = getServerRoutes(new UsersController());
    expect(routes).toHaveLength(1);

    const r = routes[0];
    expect(r.route).toBe('/users/list');
    expect(r.method).toBe('GET');
    expect(r.middlewares).toEqual(['mw-class']);
    expect(typeof r.handler).toBe('function');
  });

  it('combines class and method middlewares and respects method-level "./" path with POST', () => {
    class UsersController {
      create() {}
    }

    serverRoute('/users', ['mw-class'])(UsersController);

    Method('POST')(
      UsersController.prototype,
      'create',
      Object.getOwnPropertyDescriptor(UsersController.prototype, 'create')!
    );
    serverRoute('./create', ['mw-method'])(
      UsersController.prototype,
      'create',
      Object.getOwnPropertyDescriptor(UsersController.prototype, 'create')!
    );

    const routes = getServerRoutes(new UsersController());
    expect(routes).toHaveLength(1);

    const r = routes[0];
    expect(r.route).toBe('/users/create');
    expect(r.method).toBe('POST');
    expect(r.middlewares).toEqual(['mw-class', 'mw-method']);
  });

  it('throws when class has base path and method-level serverRoute does not start with "./"', () => {
    class ExampleController {
      foo() {}
    }

    serverRoute('/base')(ExampleController);

    serverRoute('/absolute')(
      ExampleController.prototype,
      'foo',
      Object.getOwnPropertyDescriptor(ExampleController.prototype, 'foo')!
    );

    expect(() => getServerRoutes(new ExampleController())).toThrowError(
      /must start with "\.\/" when class has @serverRoute/
    );
  });

  it('method-level serverRoute without HTTP decorator defaults to GET', () => {
    class A {
      bar() {}
    }

    serverRoute('/a')(A);
    serverRoute('./bar')(
      A.prototype,
      'bar',
      Object.getOwnPropertyDescriptor(A.prototype, 'bar')!
    );

    const routes = getServerRoutes(new A());
    expect(routes).toHaveLength(1);
    const r = routes[0];
    expect(r.route).toBe('/a/bar');
    expect(r.method).toBe('GET');
  });

  it('supports method-only HTTP decorator without class @serverRoute, defaulting path to method name', () => {
    class PingController {
      ping() {}
    }

    Post()(
      PingController.prototype,
      'ping',
      Object.getOwnPropertyDescriptor(PingController.prototype, 'ping')!
    );

    const routes = getServerRoutes(new PingController());
    expect(routes).toHaveLength(1);
    const r = routes[0];
    expect(r.route).toBe('/ping');
    expect(r.method).toBe('POST');
    expect(r.middlewares).toEqual([]);
  });
});
```

## Example prompts to improve the original request

- Please confirm: Should method-level serverRoute without an HTTP verb default to GET or be considered invalid?
- Should absolute method-level paths be allowed even when a class-level serverRoute exists (current plan forbids as per description)?
- Should getServerRoutes include inherited routes from parent classes?
- Should we export additional helpers (e.g., to clear or inspect metadata) for testing or tooling?
