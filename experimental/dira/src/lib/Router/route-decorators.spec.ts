import { describe, expect, it } from 'vitest';
import { Get, getServerRoutes, Post, serverRoute } from './route-decorators';

function byRoute(routes: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const r of routes) {
    map[r.route] = r;
  }
  return map;
}

describe('route-decorators', () => {
  it('collects routes with class base path, http methods and middleware merging', () => {
    const mwClass = () => {};
    const mwMethod1 = () => {};
    const mwMethod2 = () => {};

    class A {
      foo() {
        return 'foo';
      }
      bar() {
        return 'bar';
      }
      defaultMethod() {
        return 'default';
      }
    }

    // Apply decorators manually (avoid TS config dependency for decorator syntax)
    serverRoute('/api/([ignored])', [mwClass])(A as any);
    Get()(A as any, 'foo');
    Post()(A as any, 'bar');
    serverRoute('./bar', [mwMethod1, mwMethod2])(A.prototype as any, 'bar');

    Get()(A as any, 'defaultMethod');

    const routes = getServerRoutes(A)!;
    const r = byRoute(routes);

    // 4 routes collected (including method-level serverRoute)
    expect(Object.keys(r).sort()).toEqual(
      ['/api/([ignored])/foo()', '/api/([ignored])/bar()', '/api/([ignored])/defaultMethod()', '/bar/bar()'].sort(),
    );

    expect(r['/api/([ignored])/foo()'].method).toBe('GET');
    expect(r['/api/([ignored])/foo()'].middlewares).toEqual([mwClass]);

    expect(r['/api/([ignored])/bar()'].method).toBe('POST');
    expect(r['/api/([ignored])/bar()'].middlewares).toEqual([mwClass]);

    // method-level serverRoute creates its own base path and middlewares
    expect(r['/bar/bar()'].method).toBe('GET');
    expect(r['/bar/bar()'].middlewares).toEqual([mwMethod1, mwMethod2]);

    // default path to method name when no explicit method path provided
    expect(r['/api/([ignored])/defaultMethod()'].method).toBe('GET');
    expect(r['/api/([ignored])/defaultMethod()'].middlewares).toEqual([mwClass]);
  });

  it('handles method-level paths without class base and default paths; maintains http methods', () => {
    const mwM = () => {};

    class B {
      m1() {
        return 'm1';
      }
      m2() {
        return 'm2';
      }
      m3() {
        return 'm3';
      }
      onlyGet() {
        return 'onlyGet';
      }
    }

    // Initialize class-level state via method-level serverRoute on prototype
    serverRoute('./x', [mwM])(B.prototype as any, 'm1');
    // Method decorators use the class as target in this setup
    Post()(B as any, 'm2');
    serverRoute('/y')(B.prototype as any, 'm2');
    serverRoute('z')(B.prototype as any, 'm3');

    Get()(B as any, 'onlyGet'); // no explicit path -> '/x/onlyGet()'

    const routes = getServerRoutes(B)!;
    const r = byRoute(routes);

    expect(Object.keys(r).sort()).toEqual(['/x/m1()', '/x/m2()', '/y/m2()', '/z/m3()', '/x/onlyGet()'].sort());

    expect(r['/x/m1()'].method).toBe('GET');
    expect(r['/x/m1()'].middlewares).toEqual([mwM]);

    // Post method uses the established base '/x' and merges class-level middleware
    expect(r['/x/m2()'].method).toBe('POST');
    expect(r['/x/m2()'].middlewares).toEqual([mwM]);

    // Method-level serverRoute defines its own base and middlewares (none here)
    expect(r['/y/m2()'].method).toBe('GET');
    expect(r['/y/m2()'].middlewares).toEqual([]);

    expect(r['/z/m3()'].method).toBe('GET');
    expect(r['/z/m3()'].middlewares).toEqual([]);

    expect(r['/x/onlyGet()'].method).toBe('GET');
    expect(r['/x/onlyGet()'].middlewares).toEqual([mwM]);
  });
});
