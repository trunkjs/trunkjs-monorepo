// 08 Unabhängige Betriebsweise: Push-Stream statt einmaligem Read.
class LiveUsers extends LitElement {
  public readonly lightScope = scopeDefine({
    count: null as number | null,
    error: '',
    $hooks: {
      $connect: (): (() => void) => {
        let active = true;
        this.lightScope.count = null;
        this.lightScope.error = '';
        const stop = userApi.subscribeCount(
          count => { if (active) this.lightScope.count = count; },
          () => { if (active) this.lightScope.error = 'Live-Verbindung unterbrochen.'; },
        );
        return () => { active = false; stop(); };
      },
    },
    $tpl: prolit_html`
      <p *if="count === null && !error" role="status">Live-Verbindung wird aufgebaut …</p>
      <p *if="count !== null">Aktive Benutzer: {{ count }}</p>
      <p *if="error" role="alert">{{ error }} Die angezeigte Zahl kann veraltet sein.</p>
    `,
  });

  protected override createRenderRoot() { return this; }
  protected override render() { return html`${prolit(this.lightScope)}`; }
}
customElements.define('app-live-users', LiveUsers);
const counter = new LiveUsers();
document.body.append(counter);
await counter.updateComplete; // Der Scope ist jetzt montiert; die Subscription läuft.
// Service meldet 2: Anzeige „Aktive Benutzer: 2“.
counter.remove(); // LitElement meldet Disconnect; stop() wird einmal ausgeführt.
// Späteres erneutes Einfügen startet genau eine neue Subscription.
