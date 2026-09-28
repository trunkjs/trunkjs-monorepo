import { afterEach, describe, expect, it, vi } from 'vitest';
import { Router, route } from './router';
import { RouterContent } from '../components/router-content';
import { setDefaultRouter } from './with-router';
import type { RouteRenderContext } from './route-renderer';

class Background extends HTMLElement {}
customElements.define('renderer-background', Background);
@route({ name: 'preview', path: 'preview/:id', auxiliary: true, outlet: 'modal', presentation: 'preview' })
class Preview extends HTMLElement {}
customElements.define('renderer-preview', Preview);

afterEach(() => { document.body.replaceChildren(); history.replaceState({}, '', '/'); });

describe('route renderer contract', () => {
  it('keeps inline primary content mounted across auxiliary navigation and updates one presentation', () => {
    const router = new Router([{ path: '/', components: [Background] }, Preview]);
    let context!: RouteRenderContext;
    const update = vi.fn((next: RouteRenderContext) => { context = next; });
    const dispose = vi.fn();
    const mount = vi.fn((_component, next: RouteRenderContext) => {
      context = next;
      return { update, dispose };
    });
    router.setRenderer('preview', mount);
    setDefaultRouter(router);
    const primary = new RouterContent();
    const modal = new RouterContent();
    modal.setAttribute('name', 'modal');
    document.body.append(primary, modal);
    router.navigate('/');
    const page = primary.firstElementChild;
    router.navigateOutlet('modal', { name: 'preview', params: { id: '42' } });
    router.navigateOutlet('modal', { name: 'preview', params: { id: '7' } });
    expect(primary.firstElementChild).toBe(page);
    expect(mount).toHaveBeenCalledOnce();
    expect(context.params['id']).toBe('7');
    context.close();
    expect(router.current?.url.pathname).toBe('/');
    expect(dispose).toHaveBeenCalledOnce();
    context.close(); // A stale close callback cannot change the new route.
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('releases presentations when their outlet disconnects', () => {
    const router = new Router([{ path: '/' }, Preview]);
    const dispose = vi.fn();
    router.setRenderer('preview', () => ({ update() {}, dispose }));
    setDefaultRouter(router);
    const outlet = new RouterContent();
    outlet.setAttribute('name', 'modal');
    document.body.append(outlet);
    router.navigate('/(modal:preview/42)');
    outlet.remove();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
