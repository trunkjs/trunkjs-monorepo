import { ProlitElement, scopeDefine } from '@trunkjs/prolit';
import { routeResource } from '@trunkjs/prolit/router';
import { customElement } from 'lit/decorators.js';
import { route, withRouter } from '@trunkjs/router';

const sampleUsers: Record<string, { id: string; name: string }> = {
  '42': { id: '42', name: 'Ada' },
  '7': { id: '7', name: 'Linus' },
};

@route({ name: 'example-user', path: '/users/:id' })
@customElement('example-user-page')
export class ExampleUserPage extends withRouter(ProlitElement) {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <main>
        <nav><a href="{{ $fn.href('42') }}">Ada</a> · <a href="{{ $fn.href('7') }}">Linus</a></nav>
        <p *if="user.pending" role="status">Loading user…</p>
        <p *if="user.error" role="alert">{{ user.error.message }}</p>
        <button *if="user.error" @click="user.reload()" ?disabled="user.pending">Retry</button>
        <section *if="user.data">
          <h1>{{ user.data.name }}</h1>
          <p>User ID: {{ user.data.id }}, tab: {{ $fn.tab() }}</p>
        </section>
      </main>
    `,
    user: routeResource(this, {
      key: route => route.params['id'],
      load: async (_context, id) => {
        const user = sampleUsers[id];
        if (!user) throw new Error(`Unknown user ${id}`);
        return user;
      },
      errorMessage: 'User could not be loaded.',
    }),
    $fn: {
      tab: (): string => this.query.get('tab') ?? 'profile',
      href: (id: string): string => this.router.url({
        name: 'example-user', params: { id }, query: { tab: 'profile' },
      }),
    },
  });
}
