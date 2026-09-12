/**
 * Variant B: recommended target API for service data. NOT implemented.
 * NEW: ProlitElement, scopeResource and binding its lifecycle to scopeDefine.
 * Resource contract and tradeoffs: proposal § 5. Usage: <app-user-table-resource>.
 */
import { prolit_html, scopeDefine, scopeResource } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { UserEditDialog } from './user-edit-dialog';
import { userApi } from './user-api';

export class UserTableResource extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    // Lazy per-instance descriptor: starts on connect, never while rendering.
    // User[] is inferred from list(); pending/error/data/reload are resource-owned.
    users: scopeResource(({ signal }) => userApi.list({ signal })),
    $fn: {
      edit: async (userId: string): Promise<void> => {
        const result = await UserEditDialog.show({ userId });
        if (result.submitted) await this.scope.users.reload();
      },
    },
    $tpl: prolit_html`
      <h2>Benutzer</h2>
      <button type="button" @click="users.reload()" ?disabled="users.pending">Aktualisieren</button>
      <p *if="users.pending" role="status">Benutzer werden geladen …</p>
      <p *if="users.error" role="alert">Benutzer konnten nicht geladen werden.</p>
      <table>
        <caption>Benutzerverwaltung</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">E-Mail</th><th scope="col">Aktion</th></tr></thead>
        <tbody>
          <tr *for="user of users.data ?? []; user.id">
            <td>{{ user.name }}</td><td>{{ user.email }}</td>
            <td><button type="button" @click="$fn.edit(user.id)">Bearbeiten: {{ user.name }}</button></td>
          </tr>
        </tbody>
      </table>
      <p *if="!users.pending && !users.error && users.data?.length === 0">Keine Benutzer vorhanden.</p>
    `,
  });
}

customElements.define('app-user-table-resource', UserTableResource);
