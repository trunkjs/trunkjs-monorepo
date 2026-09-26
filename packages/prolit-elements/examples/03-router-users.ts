import { prolit_html, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { Router, route, setDefaultRouter, withRouter, type RouteChange } from '@trunkjs/router';

const sampleUsers: Record<string, { id: string; name: string }> = {
  '42': { id: '42', name: 'Ada' },
  '7': { id: '7', name: 'Linus' },
};

@route({ name: 'example-user', path: '/users/:id' })
export class ExampleUserPage extends withRouter(ProlitElement) {
  #scopeConnected = false;

  readonly state = scopeDefine({
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
        if (this.state.userId) void this.state.user.reload(this.state.userId);
        return () => { this.#scopeConnected = false; };
      },
    },
    $tpl: prolit_html`
      <main>
        <nav><a href="{{ $fn.href('42') }}">Ada</a> · <a href="{{ $fn.href('7') }}">Linus</a></nav>
        <p *if="user.pending" role="status">Loading user…</p>
        <p *if="user.error" role="alert">{{ user.error.message }}</p>
        <section *if="user.data">
          <h1>{{ user.data.name }}</h1>
          <p>User ID: {{ user.data.id }}, tab: {{ tab }}</p>
        </section>
      </main>
    `,
  });

  constructor() {
    super();
    this.scope = this.state;
  }

  protected override createRenderRoot() {
    return this;
  }

  override onRouteChange({ route }: RouteChange): void {
    this.state.tab = route.query.get('tab') ?? 'profile';
    const id = route.params['id'];
    if (id === this.state.userId) return;
    this.state.userId = id;
    // The first route arrives before Lit mounts the scope. $connect performs that read.
    if (this.#scopeConnected) void this.state.user.reload(id);
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
