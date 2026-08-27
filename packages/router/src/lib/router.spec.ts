import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router, route } from './router';
import { setDefaultRouter, withRouter } from './with-router';

describe('Router', () => {
  beforeEach(() => history.replaceState({}, '', '/'));

  it('matches decorated components and exposes params and metadata', () => {
    @route({ name: 'user', path: '/users/:id', meta: { title: 'User' } })
    class UserPage extends HTMLElement {}

    const router = new Router([UserPage]);
    const match = router.match('/users/42?tab=history');

    expect(match?.name).toBe('user');
    expect(match?.params.id).toBe('42');
    expect(match?.query.get('tab')).toBe('history');
    expect(match?.meta.title).toBe('User');
  });

  it('generates URLs from route names and parameters', () => {
    @route({ name: 'user', path: '/users/:id' })
    class UserPage extends HTMLElement {}

    const router = new Router([UserPage]);
    expect(router.url({ name: 'user', params: { id: 42 }, query: { tab: 'history' } })).toBe('/users/42?tab=history');
  });

  it('emits routechange for SPA navigation', () => {
    @route({ name: 'user', path: '/users/:id' })
    class UserPage extends HTMLElement {}

    const router = new Router([UserPage]);
    const listener = vi.fn();
    router.addEventListener('routechange', listener);
    router.navigate({ name: 'user', params: { id: 7 } });

    expect(listener).toHaveBeenCalledOnce();
    expect(router.current?.params.id).toBe('7');
  });

  it('withRouter calls onRouteChange and receives the current route on connect', () => {
    @route({ name: 'home', path: '/' })
    class HomePage extends HTMLElement {}

    const router = new Router([HomePage]);
    setDefaultRouter(router);
    router.start();

    class AwareElement extends withRouter(HTMLElement) {
      calls = 0;
      override onRouteChange() { this.calls += 1; }
    }

    const element = new AwareElement();
    document.body.append(element);
    expect(element.calls).toBe(1);
    element.remove();
    router.stop();
  });

  it('withRouter exposes the current route values and complete router', () => {
    @route({ name: 'user', path: '/users/:id', meta: { area: 'account' } })
    class UserPage extends HTMLElement {}

    const router = new Router([UserPage]);
    setDefaultRouter(router);
    history.replaceState({}, '', '/users/42?tab=profile');
    router.start();

    class AwareElement extends withRouter(HTMLElement) {}

    const element = new AwareElement();
    document.body.append(element);

    expect(element.router).toBe(router);
    expect(element.route).toBe(router.current);
    expect(element.routeName).toBe('user');
    expect(element.params.id).toBe('42');
    expect(element.query.get('tab')).toBe('profile');
    expect(element.meta.area).toBe('account');
    expect(element.url?.pathname).toBe('/users/42');

    element.router.navigate({ name: 'user', params: { id: 7 } });
    expect(element.params.id).toBe('7');

    element.remove();
    router.stop();
  });
});
