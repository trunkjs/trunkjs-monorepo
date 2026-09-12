/**
 * API DESIGN ONLY: rapid input, explicit parameters, latest response wins.
 * NEW: ProlitElement, scopeResource, event-local $event. Usage: <app-user-search>.
 * No debounce/cache is implied; README.md explains the remaining request cost.
 */
import { prolit_html, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { userApi } from './user-api';

export class UserSearch extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    query: '',
    users: scopeResource({
      load: ({ signal }, query: string) => userApi.search(query, { signal }),
      retainData: false,
      errorMessage: 'Suche fehlgeschlagen.',
    }),
    $fn: {
      search: (query: string): void => {
        this.scope.query = query;
        void this.scope.users.reload(query);
      },
    },
    $tpl: prolit_html`
      <label>Benutzer suchen
        <input type="search" .value="query" @input="$fn.search($event.currentTarget.value)">
      </label>
      <p *if="users.pending" role="status">Suche läuft …</p>
      <p *if="users.error" role="alert">{{ users.error.message }}</p>
      <button *if="users.error" type="button" @click="$fn.search(query)" ?disabled="users.pending">Erneut suchen</button>
      <ul><li *for="user of users.data ?? []; user.id">{{ user.name }}</li></ul>
      <p *if="!users.pending && !users.error && users.data?.length === 0">Keine Treffer.</p>
    `,
  });
}
customElements.define('app-user-search', UserSearch);
