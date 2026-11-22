import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuxiliaryRoute } from './auxiliary-route';
import { RouterContent } from '../components/router-content';
import { Router, route } from './router';
import { setDefaultRouter, withRouter } from './with-router';

describe('Router', () => {
  beforeEach(() => {
    history.replaceState({}, '', '/');
    document.querySelectorAll('meta[name="app-url-prefix"]').forEach((element) => element.remove());
  });

  it('ignores legacy base path metadata', () => {
    const meta = document.createElement('meta');
    meta.name = 'app-base-path';
    meta.content = '/legacy/';
    document.head.append(meta);
    try {
      expect(new Router([{ name: 'home', path: '/' }]).basePath).toBe('/');
    } finally {
      meta.remove();
    }
  });

  it('waits for application setup when router-content already exists', () => {
    const outlet = new RouterContent();
    document.body.append(outlet);
    const router = new Router([{ name: 'home', path: '/' }]);
    setDefaultRouter(router);
    router.start();
    expect(outlet.router).toBe(router);
    expect(outlet.routeName).toBe('home');
    outlet.remove();
    router.stop();
  });

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

  // Geerbte Werte bleiben auf die Ziel-Platzhalter begrenzt und URL-Aufrufe sind zustandsfrei.
  it('inherits named target parameters and merges explicit additions and overrides', () => {
    const router = new Router([
      { name: 'site', path: '/:sub_id/:site_id' },
      { name: 'page', path: '/:sub_id/:site_id/pages/:page_id' },
    ]);
    router.navigate({ name: 'site', params: { sub_id: 'tenant', site_id: 'main' } });
    const current = router.current;

    expect(router.url({ name: 'site' })).toBe('/tenant/main');
    expect(router.url({ name: 'page', params: { page_id: 'about' } }))
      .toBe('/tenant/main/pages/about');
    expect(router.url({ name: 'site', params: { site_id: 'other', unused: 'ignored' } }))
      .toBe('/tenant/other');
    expect(router.current).toBe(current);
    expect(router.current?.params).toEqual({ sub_id: 'tenant', site_id: 'main' });
    expect(() => router.url({ name: 'page' })).toThrow('Missing route parameter page_id');
  });

  // Navigation verwirft alte Parameter dauerhaft; spätere Ziele können sie nicht wiederbeleben.
  it('inherits parameters for navigate and replace and drops parameters absent from the target', () => {
    const router = new Router([
      { name: 'site', path: '/:sub_id/:site_id' },
      { name: 'page', path: '/:sub_id/:site_id/pages/:page_id' },
      { name: 'home', path: '/' },
    ]);
    router.navigate({ name: 'page', params: { sub_id: 'tenant', site_id: 'main', page_id: 'about' } });
    router.navigate({ name: 'page', params: { page_id: 'contact' } });
    expect(router.current?.params).toEqual({ sub_id: 'tenant', site_id: 'main', page_id: 'contact' });
    router.replace({ name: 'site', params: { site_id: 'other' } });
    expect(router.current?.params).toEqual({ sub_id: 'tenant', site_id: 'other' });
    expect(router.current?.url.search).toBe('');
    expect(() => router.url({ name: 'page' })).toThrow('Missing route parameter page_id');
    router.navigate({ name: 'home' });
    expect(router.current?.params).toEqual({});
    expect(() => router.url({ name: 'site' })).toThrow('Missing route parameter sub_id');
  });

  it('uses the application URL prefix from metadata for matching and navigation', () => {
    const meta = document.createElement('meta');
    meta.name = 'app-url-prefix';
    meta.content = '/production-prefix/';
    document.head.append(meta);

    const router = new Router([{ name: 'home', path: '/' }, { name: 'page', path: '/pages/:id' }]);
    expect(router.basePath).toBe('/production-prefix/');
    expect(router.match('/production-prefix/pages/42')?.params['id']).toBe('42');
    expect(router.match('/pages/42')).toBeNull();
    expect(router.url({ name: 'page', params: { id: 7 } })).toBe('/production-prefix/pages/7');
    expect(router.url('/production-prefix/pages/7?tab=details')).toBe('/production-prefix/pages/7?tab=details');

    history.replaceState({}, '', '/production-prefix/');
    router.start();
    router.navigate({ name: 'page', params: { id: 7 } });
    expect(location.pathname).toBe('/production-prefix/pages/7');
    expect(router.current?.path).toBe('/pages/7');
    router.stop();
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

    customElements.define('router-aware-lifecycle', AwareElement);
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

    customElements.define('router-aware-values', AwareElement);
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
  it('reports unmatched navigation and leaves history and current route unchanged', async () => {
    const router = new Router([{ name: 'home', path: '/' }]);
    router.navigate('/');
    const current = router.current;
    const routeChange = vi.fn();
    const notFound = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    router.addEventListener('routechange', routeChange);
    router.addEventListener('route-not-found', notFound);
    for (const target of ['/missing', 'https://elsewhere.example/', '/(sidebar:)', '/%ZZ']) {
      expect(await router.navigate(target)).toBeNull();
      expect(router.current).toBe(current);
      expect(location.pathname).toBe('/');
    }
    expect(routeChange).not.toHaveBeenCalled();
    expect(notFound).toHaveBeenCalledTimes(4);
    expect(consoleError).toHaveBeenCalledWith('<router-content>: Route not found: /missing');
    consoleError.mockRestore();
  });

  it('round-trips file paths and parentheses through primary and auxiliary routes', async () => {
    const router = new Router([{ name: 'page', path: '/pages/:id' }], [
      new AuxiliaryRoute({ name: 'file', outlet: 'sidebar', path: 'files/:id', components: [] }),
    ]);
    expect(router.match('/pages/%ZZ')).toBeNull();
    expect(router.match('https://[')).toBeNull();
    const id = 'docs/intro(v2)';
    expect((await router.navigate({ name: 'page', params: { id } }))?.params['id']).toBe(id);
    expect((await router.navigateOutlet('sidebar', { name: 'file', params: { id } }))?.outlets['sidebar'].params['id']).toBe(id);
  });

  it('rebinds existing outlets to the configured router and preserves editors on query changes', () => {
    class Editor extends withRouter(HTMLElement) {
      changes = 0;
      override onRouteChange() { this.changes += 1; }
    }
    customElements.define('review-editor', Editor);
    const previous = new Router();
    setDefaultRouter(previous);
    const outlet = new RouterContent();
    document.body.append(outlet);
    const router = new Router([{ name: 'page', path: '/', components: [Editor] }]);
    setDefaultRouter(router);
    router.start();
    const editor = outlet.firstElementChild as Editor;
    expect(editor).toBeInstanceOf(Editor);
    router.navigate('/?lang=de');
    expect(outlet.firstElementChild).toBe(editor);
    expect(editor.query.get('lang')).toBe('de');
    const changes = editor.changes;
    outlet.remove();
    router.navigate('/?lang=en');
    expect(editor.changes).toBe(changes);
    router.stop();
  });

  it('prefixes root-relative links before handling browser navigation', () => {
    const meta = document.createElement('meta');
    meta.name = 'app-url-prefix';
    meta.content = '/production-prefix/';
    document.head.append(meta);
    history.replaceState({}, '', '/production-prefix/');

    const router = new Router([{ path: '/' }, { path: '/next' }]);
    router.start();
    const link = document.createElement('a');
    link.href = '/next?tab=details';
    document.body.append(link);

    const modifiedClick = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    link.dispatchEvent(modifiedClick);
    expect(modifiedClick.defaultPrevented).toBe(false);
    expect(link.getAttribute('href')).toBe('/production-prefix/next?tab=details');

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(location.pathname).toBe('/production-prefix/next');
    expect(location.search).toBe('?tab=details');

    link.remove();
    router.stop();
  });

  it('intercepts shadow-root anchors but leaves download links alone', () => {
    const router = new Router([{ path: '/' }, { path: '/next' }]);
    router.start();
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<a href="/next"><span>Next</span></a><a href="/next" download>Download</a>';
    document.body.append(host);
    const downloadClick = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true });
    shadow.querySelector('[download]')!.dispatchEvent(downloadClick);
    expect(downloadClick.defaultPrevented).toBe(false);
    const click = new MouseEvent('click', { bubbles: true, composed: true, cancelable: true });
    shadow.querySelector('span')!.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(location.pathname).toBe('/next');
    host.remove();
    router.stop();
  });

  it('awaits beforeEach on the first start and supports cancel and redirect', async () => {
    const router = new Router([{ path: '/' }, { path: '/login' }, { path: '/private' }]);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const called = vi.fn(async (to: { path: string }) => {
      await pending;
      if (to.path === '/private') return '/login';
      return true;
    });
    router.beforeEach(called);
    const start = router.start();
    expect(router.current).toBeNull();
    release();
    await start;
    expect(router.current?.path).toBe('/');
    expect(called).toHaveBeenCalledOnce();
    expect((await router.navigate('/private'))?.path).toBe('/login');
    expect(location.pathname).toBe('/login');
    const remove = router.beforeEach(() => false);
    expect(await router.navigate('/private')).toBeNull();
    expect(location.pathname).toBe('/login');
    remove();
    expect((await router.navigate('/'))?.path).toBe('/');
    router.stop();
  });

  it('does not commit an obsolete asynchronous navigation', async () => {
    const router = new Router([{ path: '/' }, { path: '/slow' }, { path: '/fast' }]);
    let release!: () => void;
    router.beforeEach((to) => to.path === '/slow'
      ? new Promise<boolean>((resolve) => { release = () => resolve(true); })
      : true);
    await router.start();
    const slow = router.navigate('/slow');
    await router.navigate('/fast');
    release();
    expect(await slow).toBeNull();
    expect(router.current?.path).toBe('/fast');
    router.stop();
  });
});
