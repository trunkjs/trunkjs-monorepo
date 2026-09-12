/**
 * API DESIGN ONLY: smallest complete load / empty / error / retry example.
 * Same API as user-table.ts, reduced to one responsibility. No automatic fetch.
 * NEW: ProlitElement, scopeResource and $connect. Usage: <app-user-table-resource>.
 */
import { prolit_html, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { userApi } from './user-api';

export class UserTableResource extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    users: scopeResource({
      load: ({ signal }) => userApi.list({ signal }),
      errorMessage: 'Benutzer konnten nicht geladen werden.',
    }),
    $fn: { reload: (): void => { void this.scope.users.reload(); } },
    $hooks: { $connect: (): void => { void this.scope.$fn.reload(); } },
    $tpl: prolit_html`
      <button type="button" @click="$fn.reload()" ?disabled="users.pending">Neu laden</button>
      <p *if="users.pending" role="status">Lädt …</p>
      <p *if="users.error" role="alert">{{ users.error.message }}</p>
      <ul><li *for="user of users.data ?? []; user.id">{{ user.name }}</li></ul>
      <p *if="!users.pending && !users.error && users.data?.length === 0">Keine Benutzer.</p>
    `,
  });
}
customElements.define('app-user-table-resource', UserTableResource);
