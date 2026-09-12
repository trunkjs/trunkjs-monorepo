/**
 * API DESIGN ONLY: list -> own edit dialog -> refresh after successful save.
 * NEW: ProlitElement, scopeResource, scopeAction and $connect lifecycle.
 * Usage: <app-user-table>. See README.md and proposal §§ 3–6.
 */
import { html } from 'lit';
import { prolit_html, scopeDefine, scopeResource, scopeAction } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { UserEditDialog } from './user-edit-dialog';
import { userApi } from './user-api';

export class UserTable extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    users: scopeResource({
      load: ({ signal }) => userApi.list({ signal }),
      errorMessage: 'Benutzer konnten nicht geladen werden.',
    }),
    $fn: {
      reload: (): void => { void this.scope.users.reload(); },
      edit: scopeAction({
        run: async (userId: string): Promise<void> => {
          const result = await UserEditDialog.show({ userId });
          if (result.submitted) await this.scope.users.reload();
          // A refresh failure belongs to users.error; the save already succeeded.
        },
        errorMessage: 'Der Bearbeitungsdialog konnte nicht abgeschlossen werden.',
      }),
    },
    $hooks: { $connect: (): void => { void this.scope.$fn.reload(); } },
    $tpl: prolit_html`
      <h2>Benutzer</h2>
      <button type="button" @click="$fn.reload()" ?disabled="users.pending || $fn.edit.pending">Aktualisieren</button>
      <p *if="users.pending" role="status">Benutzer werden geladen …</p>
      <p *if="users.error" role="alert">{{ users.error.message }}</p>
      <p *if="$fn.edit.error" role="alert">{{ $fn.edit.error.message }}</p>
      <table>
        <caption>Benutzerverwaltung</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">E-Mail</th><th scope="col">Aktion</th></tr></thead>
        <tbody>
          <tr *for="user of users.data ?? []; user.id">
            <td>{{ user.name }}</td><td>{{ user.email }}</td>
            <td><button type="button" @click="$fn.edit(user.id)" ?disabled="users.pending || $fn.edit.pending">Bearbeiten: {{ user.name }}</button></td>
          </tr>
        </tbody>
      </table>
      <p *if="!users.pending && !users.error && users.data?.length === 0">Keine Benutzer vorhanden.</p>
    `,
  });

  // Only the frame is in Shadow DOM; the application markup stays in Light DOM.
  override render() { return html`<section part="frame"><slot></slot></section>`; }
}
customElements.define('app-user-table', UserTable);
