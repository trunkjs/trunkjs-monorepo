// 02a Ersetzt den manuellen Renderort aus 01; die Daten-/Aktions-API bleibt gleich.
// ProlitElement ist optionaler Komfort für eigene Komponenten, kein Muss für Hosts.
class UserWorkspace extends ProlitElement {
  public shadowScope = scopeDefine({
    title: 'Verwaltung',
    $tpl: prolit_html`<header>{{ title }}</header><slot></slot>`,
  });

  public lightScope = scopeDefine({
    name: 'Ada',
    $fn: { rename: (): void => { this.lightScope.name = 'Ada Lovelace'; } },
    $tpl: prolit_html`
      <p>{{ name }}</p>
      <button type="button" @click="$fn.rename()">Vollständiger Name</button>
    `,
  });
}
customElements.define('app-user-workspace', UserWorkspace);
const workspace = new UserWorkspace();
document.body.append(workspace);
// Ergebnis: Header im Shadow Root; Absatz/Button im verwalteten Light-DOM-Bereich.
// rename verändert nur lightScope. Der Slot projiziert diesen Inhalt in das Gerüst.

// 02b Unabhängige Alternative: ersetzt den render()-Aufruf aus 01.
// Die App hat nte-dialog über @nextrap/nte-dialog registriert.
render(html`<nte-dialog>${prolit(scope)}</nte-dialog>`, target);
// Derselbe Scope liegt jetzt im Light DOM von nte-dialog statt direkt in target.
// Den Dialog öffnen und sein Ergebnis verwenden zeigt 03.

// 02c Ergänzt 01 beim endgültigen Entfernen seines manuell verwalteten Renderorts.
part.setConnected(false);
render(nothing, target);
target.remove();
// Reine DOM-Entfernung meldet Lit keinen zuverlässigen Disconnect.
// ProlitElement und LitElement übernehmen die Verbindung ihrer eigenen Roots.
