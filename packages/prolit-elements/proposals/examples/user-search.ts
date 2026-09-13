// 06 Unabhängige Variante zu 04: parametrisierter Read bei Eingabe.
class UserSearch extends LitElement {
  public readonly lightScope = scopeDefine({
    query: '',
    users: scopeResource({
      load: ({ signal }, query: string) => userApi.search(query, { signal }),
      retainData: false,
      errorMessage: 'Suche fehlgeschlagen.',
    }),
    $fn: {
      search: (query: string): void => {
        this.lightScope.query = query;
        void this.lightScope.users.reload(query);
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

  protected override createRenderRoot() { return this; }
  protected override render() { return html`${prolit(this.lightScope)}`; }
}
customElements.define('app-user-search', UserSearch);
const search = new UserSearch();
document.body.append(search);
// Eingabe „Ad“, danach „Ada“: Nur das Ergebnis von „Ada“ darf übernommen werden.
// Ein Request pro Eingabe; Debounce ist nicht Teil dieses Beispiels.
