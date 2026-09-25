import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuxiliaryRoute } from './auxiliary-route';
import { RouterContent } from '../components/router-content';
import { Router, route } from './router';
import { setDefaultRouter, withRouter } from './with-router';

describe('Router', () => {
  beforeEach(() => history.replaceState({}, '', '/'));

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

  it('emits routechange for SPA navigation', async () => {
    @route({ name: 'user', path: '/users/:id' })
    class UserPage extends HTMLElement {}

    const router = new Router([UserPage]);
    const listener = vi.fn();
    router.addEventListener('routechange', listener);
    await router.navigate({ name: 'user', params: { id: 7 } });

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

  it('withRouter exposes the current route values and complete router', async () => {
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

    await element.router.navigate({ name: 'user', params: { id: 7 } });
    expect(element.params.id).toBe('7');

    element.remove();
    router.stop();
  });
  it('leaves history and current route unchanged when navigation cannot match', async () => {
    const router = new Router([{ name: 'home', path: '/' }]);
    await router.navigate('/');
    const current = router.current;
    const listener = vi.fn();
    router.addEventListener('routechange', listener);
    for (const target of ['/missing', 'https://elsewhere.example/', '/(sidebar:)', '/%ZZ']) {
      expect(await router.navigate(target)).toBeNull();
      expect(router.current).toBe(current);
      expect(location.pathname).toBe('/');
    }
    expect(listener).not.toHaveBeenCalled();
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

  it('rebinds existing outlets to the configured router and preserves editors on query changes', async () => {
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
    await router.navigate('/?lang=de');
    expect(outlet.firstElementChild).toBe(editor);
    expect(editor.query.get('lang')).toBe('de');
    const changes = editor.changes;
    outlet.remove();
    await router.navigate('/?lang=en');
    expect(editor.changes).toBe(changes);
    router.stop();
  });

  it('intercepts shadow-root anchors but leaves download links alone', async () => {
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
    await vi.waitFor(() => expect(location.pathname).toBe('/next'));
    host.remove();
    router.stop();
  });

  it('asks only while dirty, allows a custom asynchronous confirmation, and unregisters it', async () => {
    const router = new Router([{ path: '/' }, { path: '/next' }]);
    router.start();
    let dirty = false;
    const defaultConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const dispose = router.addDirtyCheck(() => dirty);
    expect(await router.navigate('/next')).not.toBeNull();
    expect(defaultConfirm).not.toHaveBeenCalled();
    dirty = true;
    expect(await router.navigate('/')).toBeNull();
    expect(location.pathname).toBe('/next');
    expect(defaultConfirm).toHaveBeenCalledOnce();
    dispose();

    let resolve!: (value: boolean) => void;
    const confirmation = vi.fn(() => new Promise<boolean>((done) => { resolve = done; }));
    const remove = router.addDirtyCheck(({ source }) => source === 'navigate', confirmation);
    const pending = router.navigate('/');
    expect(location.pathname).toBe('/next');
    resolve(true);
    expect((await pending)?.path).toBe('/');
    expect(confirmation).toHaveBeenCalledOnce();
    remove();
    defaultConfirm.mockRestore();
    router.stop();
  });

  it('guards query changes and intercepted links before replacing the editor', async () => {
    const router = new Router([{ path: '/' }, { path: '/next' }]);
    router.start();
    const confirm = vi.fn().mockResolvedValue(false);
    const dispose = router.addDirtyCheck(() => true, confirm);
    expect(await router.replace('/?page=2')).toBeNull();
    expect(location.search).toBe('');
    const link = document.createElement('a');
    link.href = '/next';
    document.body.append(link);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
    expect(location.pathname).toBe('/');
    dispose();
    link.remove();
    router.stop();
  });

  it('restores the history entry when a dirty editor rejects Back, then accepts it', async () => {
    const router = new Router([{ path: '/' }, { path: '/next' }]);
    router.start();
    await router.navigate('/next');
    const confirm = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const dispose = router.addDirtyCheck(() => true, confirm);
    router.back();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(location.pathname).toBe('/next'));
    expect(router.current?.path).toBe('/next');
    router.back();
    await vi.waitFor(() => expect(router.current?.path).toBe('/'));
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockResolvedValueOnce(false);
    router.forward();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalledTimes(3));
    await vi.waitFor(() => expect(location.pathname).toBe('/'));
    expect(router.current?.path).toBe('/');
    dispose();
    router.stop();
  });

  it('ignores a stale confirmation when a newer navigation has committed', async () => {
    const router = new Router([{ path: '/' }, { path: '/one' }, { path: '/two' }]);
    router.start();
    let resolve!: (value: boolean) => void;
    const dispose = router.addDirtyCheck(() => true, ({ to }) =>
      to.path === '/one' ? new Promise<boolean>((done) => { resolve = done; }) : true);
    const pending = router.navigate('/one');
    expect((await router.navigate('/two'))?.path).toBe('/two');
    resolve(true);
    expect(await pending).toBeNull();
    expect(router.current?.path).toBe('/two');
    dispose();
    router.stop();
  });

});
