import { ProlitElement, scopeAction, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { customElement } from 'lit/decorators.js';

import { API, type User } from './02-api';

@customElement('example-api-users')
export class ExampleApiUsers extends ProlitElement {
  protected override scope = scopeDefine({
    // language=HTML
    $tpl: `
      <section>
        <label>Search <input .value="query" @input="$fn.search($event.currentTarget.value)"></label>
        <p *if="users.pending" role="status">Loading users…</p>
        <p *if="users.error" role="alert">{{ users.error.message }}</p>
        <button @click="users.reload(query)" ?disabled="users.pending">Retry</button>
        <p *if="!users.pending && users.data?.length === 0">No users found.</p>
        <ul><li *for="user of users.data ?? []; user.id">{{ user.name }}</li></ul>

        <form @submit="$event.preventDefault(); $fn.submit()">
          <label>Name <input required .value="draft" @input="draft = $event.currentTarget.value"></label>
          <button type="submit" ?disabled="!draft.trim() || $fn.create.pending">Create</button>
        </form>
        <p *if="$fn.create.pending" role="status">Saving…</p>
        <p *if="$fn.create.error" role="alert">{{ $fn.create.error.message }}</p>
      </section>
    `,

    query: '',
    draft: '',
    users: scopeResource<User[], [string]>({
      load: ({ signal }, query) => API.Users.List.request({ query: { q: query }, options: { signal } }),
      retainData: false,
      errorMessage: 'Users could not be loaded.',
    }),
    $fn: {
      search: (query: string): void => {
        this.scope.query = query;
        void this.scope.users.reload(query);
      },
      submit: async (): Promise<void> => {
        const name = this.scope.draft.trim();
        if (!name) return;
        const result = await this.scope.$fn.create(name);
        if (result.status !== 'success' || !this.isConnected) return;
        this.scope.draft = '';
        await this.scope.users.reload(this.scope.query);
      },
      create: scopeAction<User, [string]>({
        run: (name) => API.Users.Create.request({ body: { name } }),
        errorMessage: 'User could not be saved.',
      }),
    },
    $hooks: {
      $connect: (): void => { void this.scope.users.reload(this.scope.query); },
    },
  });
}
