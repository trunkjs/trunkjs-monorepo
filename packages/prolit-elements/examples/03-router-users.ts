import { prolit_html as html, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

const sampleUsers: Record<string, { id: string; name: string }> = {
  '42': { id: '42', name: 'Ada' },
  '7': { id: '7', name: 'Linus' },
};

const template = html`
  <main>
    <nav><a href="{{ $fn.href('42') }}">Ada</a> · <a href="{{ $fn.href('7') }}">Linus</a></nav>
    <p *if="user.pending" role="status">Loading user…</p>
    <p *if="user.error" role="alert">{{ user.error.message }}</p>
    <section *if="user.data">
      <h1>{{ user.data.name }}</h1>
      <p>User ID: {{ user.data.id }}, tab: {{ tab }}</p>
    </section>
  </main>
`;

@route({ name: 'example-user', path: '/users/:id' })
export class ExampleUserPage extends withRouter(ProlitElement) {
  #scopeConnected = false;

  override scope = scopeDefine({
    userId: '',
    tab: 'profile',
    user: scopeResource<{ id: string; name: string }, [string]>({
      load: async (_context, id) => {
        const user = sampleUsers[id];
        if (!user) throw new Error(`Unknown user ${id}`);
        return user;
      },
      retainData: false,
      errorMessage: 'User could not be loaded.',
    }),
    $fn: {
      href: (id: string): string => this.router.url({
        name: 'example-user', params: { id }, query: { tab: 'profile' },
      }),
    },
    $hooks: {
      $connect: (): (() => void) => {
        this.#scopeConnected = true;
        if (this.scope.userId) void this.scope.user.reload(this.scope.userId);
        return () => { this.#scopeConnected = false; };
      },
    },
    $tpl: template,
  });

  protected override createRenderRoot() {
    return this;
  }

  override onRouteChange({ route }: RouteChange): void {
    this.scope.tab = route.query.get('tab') ?? 'profile';
    const id = route.params['id'];
    if (id === this.scope.userId) return;
    this.scope.userId = id;
    // The first route arrives before Lit mounts the scope. $connect performs that read.
    if (this.#scopeConnected) void this.scope.user.reload(id);
  }
}

customElements.define('example-user-page', ExampleUserPage);

export function startRouterExample(target: HTMLElement): Router {
  const router = new Router([ExampleUserPage]);
  setDefaultRouter(router);
  target.innerHTML = '<router-content></router-content>';
  router.start();
  if (!router.current) router.replace({ name: 'example-user', params: { id: 42 } });
  return router;
}
