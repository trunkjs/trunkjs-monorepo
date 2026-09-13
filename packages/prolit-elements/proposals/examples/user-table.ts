// 04 Ergänzt 03: Die Tabelle öffnet UserEditDialog und aktualisiert nach Save.
class UserTable extends LitElement {
  public readonly lightScope = scopeDefine({
    users: scopeResource({
      load: ({ signal }) => userApi.list({ signal }),
      errorMessage: 'Benutzer konnten nicht geladen werden.',
    }),
    $fn: {
      reload: (): void => { void this.lightScope.users.reload(); },
      edit: scopeAction({
        run: async (userId: string): Promise<void> => {
          const result = await UserEditDialog.show({ userId });
          if (result.submitted) await this.lightScope.users.reload();
          // A refresh failure belongs to users.error; the save already succeeded.
        },
        errorMessage: 'Der Bearbeitungsdialog konnte nicht abgeschlossen werden.',
      }),
    },
    $hooks: { $connect: (): void => { void this.lightScope.$fn.reload(); } },
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

  protected override createRenderRoot() { return this; }
  protected override render() { return html`${prolit(this.lightScope)}`; }
}
customElements.define('app-user-table', UserTable);
const table = new UserTable();
document.body.append(table);
// User 42 bearbeiten, Name zu „Ada Lovelace“ ändern, speichern:
// submitted führt zum Reload; Abbrechen lässt die Liste unverändert.
