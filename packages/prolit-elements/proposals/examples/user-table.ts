/**
 * Variant A: explicit callbacks. API sketch, not an executable demo.
 * NEW: ProlitElement and execution of $hooks.$init. See proposal § 3–5.
 * Usage: <app-user-table></app-user-table>
 */
import { html } from 'lit';
import { prolit_html, scopeDefine } from '@trunkjs/prolit';
import { ProlitElement } from '@trunkjs/prolit-elements';
import { UserEditDialog } from './user-edit-dialog';
import { userApi, type User } from './user-api';

export class UserTable extends ProlitElement {
  public scope = scopeDefine({
    $this: this,
    users: [] as User[],
    loading: false,
    error: '',
    $hooks: {
      $init: async (): Promise<void> => this.scope.$fn.reload(),
    },
    $fn: {
      reload: async (): Promise<void> => {
        if (this.scope.loading) return;
        this.scope.loading = true;
        this.scope.error = '';
        try {
          this.scope.users = await userApi.list();
        } catch {
          this.scope.error = 'Benutzer konnten nicht geladen werden.';
        } finally {
          this.scope.loading = false;
        }
      },
      edit: async (userId: string): Promise<void> => {
        const result = await UserEditDialog.show({ userId });
        if (result.submitted) {
          this.scope.users = this.scope.users.map(user =>
            user.id === result.data.id ? result.data : user,
          );
        }
      },
    },
    // Scope first, then the complete Light DOM template in this same file.
    $tpl: prolit_html`
      <h2>Benutzer</h2>
      <button type="button" @click="$fn.reload()" ?disabled="loading">Aktualisieren</button>
      <p *if="loading" role="status">Benutzer werden geladen …</p>
      <p *if="error" role="alert">{{ error }}</p>
      <table>
        <caption>Benutzerverwaltung</caption>
        <thead><tr><th scope="col">Name</th><th scope="col">E-Mail</th><th scope="col">Aktion</th></tr></thead>
        <tbody>
          <tr *for="user of users; user.id">
            <td>{{ user.name }}</td><td>{{ user.email }}</td>
            <td><button type="button" @click="$fn.edit(user.id)">Bearbeiten: {{ user.name }}</button></td>
          </tr>
        </tbody>
      </table>
      <p *if="!loading && !error && users.length === 0">Keine Benutzer vorhanden.</p>
    `,
  });

  // Optional Shadow DOM shell. ProlitElement renders scope.$tpl into Light DOM.
  // Omitting this method uses the proposed default shell: <slot></slot>.
  override render() {
    return html`<section part="frame"><slot></slot></section>`;
  }
}

customElements.define('app-user-table', UserTable);
