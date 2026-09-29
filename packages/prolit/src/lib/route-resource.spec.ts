import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { route, Router, setDefaultRouter, withRouter } from '@trunkjs/router';
import { scopeDefine } from '@trunkjs/prolit-renderer';
import { ProlitElement } from './ProlitElement';
import { routeResource } from './route-resource';

type User = { id: string; name: string };
const requests: Array<{ id: string; signal: AbortSignal; resolve(user: User): void }> = [];
const load = vi.fn(({ signal }: { signal: AbortSignal }, id: string) =>
  new Promise<User>((resolve) => { requests.push({ id, signal, resolve }); }));

@route({ path: '/users/:id' })
class ResourcePage extends withRouter(ProlitElement) {
  public override scope = scopeDefine({
    $tpl: '<p>{{ user.data?.name ?? "none" }} / {{ $fn.tab() }}</p>',
    user: routeResource(this, {
      key: route => route.params['id'],
      load,
      errorMessage: 'User could not be loaded.',
    }),
    $fn: { tab: () => this.query.get('tab') ?? 'profile' },
  });
}
customElements.define('test-route-resource-page', ResourcePage);

beforeEach(() => {
  requests.length = 0;
  load.mockClear();
  history.replaceState({}, '', '/users/42?tab=profile');
});
afterEach(() => { document.body.replaceChildren(); });

describe('routeResource', () => {
  it('starts once after the scope mount and ignores a superseded read', async () => {
    const router = new Router([ResourcePage]);
    setDefaultRouter(router);
    const detached = new ResourcePage();
    expect(load).not.toHaveBeenCalled();
    document.body.innerHTML = '<router-content></router-content>';
    router.start();
    try {
      await vi.waitFor(() => expect(requests).toHaveLength(1));
      expect(requests[0].id).toBe('42');
      const page = document.querySelector('test-route-resource-page') as ResourcePage;
      expect(page.scope.user.pending).toBe(true);
      await router.navigate('/users/7');
      await vi.waitFor(() => expect(requests).toHaveLength(2));
      expect(requests[0].signal.aborted).toBe(true);
      const next = document.querySelector('test-route-resource-page') as ResourcePage;
      expect(next).not.toBe(page);
      requests[0].resolve({ id: '42', name: 'Ada' }); // A transport may ignore abort.
      expect(next.scope.user.data).toBeUndefined();
      requests[1].resolve({ id: '7', name: 'Linus' });
      await vi.waitFor(() => expect(next.scope.user.data?.name).toBe('Linus'));
      expect(page.scope.user.data).toBeUndefined();
      detached.remove();
    } finally { router.stop(); }
  });

  it('does not read for tab or hash changes and reloads on reconnect', async () => {
    const router = new Router([ResourcePage]);
    setDefaultRouter(router);
    const outlet = document.createElement('router-content');
    document.body.append(outlet);
    router.start();
    try {
      await vi.waitFor(() => expect(requests).toHaveLength(1));
      requests[0].resolve({ id: '42', name: 'Ada' });
      await router.updateQuery({ tab: 'history' }, { replace: true });
      await router.replace('/users/42?tab=history#details');
      expect(load).toHaveBeenCalledTimes(1);
      const page = outlet.firstElementChild as ResourcePage;
      await vi.waitFor(() => expect(page.textContent).toContain('history'));
      outlet.remove();
      document.body.append(outlet);
      await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
      requests[1].resolve({ id: '42', name: 'Ada' });
    } finally { router.stop(); }
  });
});
