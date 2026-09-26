import { prolit_html as html, scopeAction, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';

interface User {
  id: string;
  name: string;
}

// The application server supplies GET /api/users?q=... -> User[] and
// POST /api/users with { name } -> User. See README for the contract.
async function listUsers(query: string, signal: AbortSignal): Promise<User[]> {
  const response = await fetch(`/api/users?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) throw new Error(`GET /api/users: ${response.status}`);
  return (await response.json()) as User[];
}

async function createUser(name: string): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error(`POST /api/users: ${response.status}`);
  return (await response.json()) as User;
}

const template = html`
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
`;

export class ExampleApiUsers extends ProlitElement {
  override scope = scopeDefine({
    query: '',
    draft: '',
    users: scopeResource<User[], [string]>({
      load: ({ signal }, query) => listUsers(query, signal),
      retainData: false,
      errorMessage: 'Users could not be loaded.',
    }),
    $fn: {
      search: (query: string): void => {
        this.scope.query = query;
        void this.scope.users.reload(query);
      },
      submit: (): Promise<void> => this.submit(),
      create: scopeAction<User, [string]>({
        run: (name) => createUser(name),
        errorMessage: 'User could not be saved.',
      }),
    },
    $hooks: {
      $connect: (): void => { void this.scope.users.reload(this.scope.query); },
    },
    $tpl: template,
  });

  private async submit(): Promise<void> {
    const name = this.scope.draft.trim();
    if (!name) return;
    const result = await this.scope.$fn.create(name);
    if (result.status !== 'success' || !this.isConnected) return;
    this.scope.draft = '';
    await this.scope.users.reload(this.scope.query);
  }
}

customElements.define('example-api-users', ExampleApiUsers);

export function mountApiUsers(target: HTMLElement): ExampleApiUsers {
  const users = document.createElement('example-api-users') as ExampleApiUsers;
  target.append(users);
  return users;
}
