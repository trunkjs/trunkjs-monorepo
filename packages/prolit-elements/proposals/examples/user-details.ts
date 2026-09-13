// 07 Ersetzt das Suchfeld aus 06 durch eine öffentliche Auswahl-Aktion.
class UserDetails extends LitElement {
  public readonly lightScope = scopeDefine({
    selectedId: null as string | null,
    user: scopeResource({
      load: ({ signal }, userId: string) => userApi.get(userId, { signal }),
      retainData: false, // Never show A's data under B's selection.
      errorMessage: 'Details konnten nicht geladen werden.',
    }),
    $fn: {
      select: (userId: string): void => {
        this.lightScope.selectedId = userId;
        void this.lightScope.user.reload(userId);
      },
      reload: (): void => {
        if (this.lightScope.selectedId !== null) void this.lightScope.user.reload(this.lightScope.selectedId);
      },
    },
    $hooks: { $connect: (): void => this.lightScope.$fn.reload() },
    $tpl: prolit_html`
      <p *if="selectedId === null">Bitte einen Benutzer auswählen.</p>
      <p *if="user.pending" role="status">Details werden geladen …</p>
      <p *if="user.error" role="alert">{{ user.error.message }}</p>
      <button *if="user.error" type="button" @click="$fn.reload()" ?disabled="user.pending">Erneut laden</button>
      <article *if="user.data !== undefined">
        <h2>{{ user.data.name }}</h2><p>{{ user.data.email }}</p>
      </article>
    `,
  });

  protected override createRenderRoot() { return this; }
  protected override render() { return html`${prolit(this.lightScope)}`; }
}
customElements.define('app-user-details', UserDetails);
const details = new UserDetails();
details.lightScope.$fn.select('42'); // Noch unmontiert: ID merken, Read wird cancelled.
document.body.append(details); // Beim Mount liest $connect die gemerkte ID.
// Ergebnis für 42: Ada; spätere Auswahl von 84 darf keine Details von 42 behalten.
