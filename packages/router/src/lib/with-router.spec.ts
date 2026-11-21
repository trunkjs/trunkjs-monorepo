import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProlitElement, scopeDefine } from '@trunkjs/prolit';
import { Router } from './router';
import { setDefaultRouter, withRouter } from './with-router';

// Ein echter Prolit-Host prüft Scope-Vertrag und direkte Template-Auflösung gemeinsam.
class ScopeRouterHost extends withRouter(ProlitElement) {
  override scope = scopeDefine({
    $tpl: `<a .href="$router.url({ name: 'page', params: { id: '42' } })">Seite</a><span>{{ $router.current?.params.id }}</span>`,
  });
}
customElements.define('test-scope-router-host', ScopeRouterHost);

// Hosts ohne Prolit müssen das Mixin unverändert verwenden können.
class PlainRouterHost extends withRouter(HTMLElement) {}
customElements.define('test-plain-router-host', PlainRouterHost);

const routers: Router[] = [];
// Jeder Test verwendet eine eigene Router-Instanz und deterministische History.
function createRouter(path = '/pages/:id'): Router {
  const router = new Router([{ name: 'page', path }]);
  routers.push(router);
  return router;
}
afterEach(() => {
  document.body.replaceChildren();
  routers.splice(0).forEach(router => router.stop());
  history.replaceState({}, '', '/');
});

describe('withRouter Prolit scope', () => {
  // Der reservierte Name existiert auch ohne Router-Mixin im Standard-Scope.
  it('defines the standard scope key without creating a router', () => {
    const scope = scopeDefine({});
    expect('$router' in scope).toBe(true);
    expect(scope.$router).toBeUndefined();
  });

  // Die Bereitstellung muss vor dem ersten Rendern und Route-Callback erfolgen.
  it('provides the router for direct href bindings before route callbacks', async () => {
    const router = createRouter();
    setDefaultRouter(router);
    router.navigate({ name: 'page', params: { id: '1' } });
    const host = new ScopeRouterHost();
    const callback = vi.spyOn(host, 'onRouteChange').mockImplementation(() => {
      expect(host.scope.$router).toBe(router);
    });
    document.body.append(host);
    await host.updateComplete;
    expect(callback).toHaveBeenCalled();
    expect(host.scope.$router).toBe(router);
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/pages/42');
  });

  // Router-Wechsel aktualisieren die Instanz und dadurch das bereits gerenderte Template.
  it('updates connected scopes when the default router changes', async () => {
    setDefaultRouter(createRouter());
    const host = new ScopeRouterHost();
    document.body.append(host);
    await host.updateComplete;
    const replacement = createRouter('/other/:id');
    setDefaultRouter(replacement);
    expect(host.scope.$router).toBe(replacement);
    await vi.waitFor(() => expect(host.querySelector('a')?.getAttribute('href')).toBe('/other/42'));
  });

  // Auch unveränderte Router-Instanzen können bei Navigation neue URL-Ausdrücke liefern.
  it('refreshes scopes on navigation and rebinds after reconnecting', async () => {
    const router = createRouter();
    setDefaultRouter(router);
    const host = new ScopeRouterHost();
    document.body.append(host);
    await host.updateComplete;
    router.navigate({ name: 'page', params: { id: '2' } });
    await vi.waitFor(() => expect(host.querySelector('span')?.textContent).toBe('2'));
    router.navigate({ name: 'page', params: { id: '3' } });
    await vi.waitFor(() => expect(host.querySelector('span')?.textContent).toBe('3'));
    host.remove();
    const replacement = createRouter('/new/:id');
    setDefaultRouter(replacement);
    document.body.append(host);
    expect(host.scope.$router).toBe(replacement);
  });

  // Das Mixin führt keine Prolit-Pflicht und keinen künstlichen Scope ein.
  it('continues to support hosts without a Prolit scope', () => {
    const router = createRouter();
    setDefaultRouter(router);
    const host = new PlainRouterHost();
    expect(() => document.body.append(host)).not.toThrow();
    expect(host.router).toBe(router);
    expect('scope' in host).toBe(false);
  });
});
