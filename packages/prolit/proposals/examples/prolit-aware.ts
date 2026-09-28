// 05 Ergänzt den festen Scope aus 03 um optional austauschbaren Inhalt.
// Ein normaler Anwendungsdialog; keine Prolit-spezifische Dialog-Basisklasse.
class InfoDialog extends NteDialogComponent implements ProlitAware {
  static override properties = { contentScope: { attribute: false } };
  declare public contentScope?: ProlitScope;

  protected override renderDialog() {
    // Einbindung einmal pro Inhaltspunkt. html erhält Nextraps TemplateResult-Typ.
    return html`${prolit(this.contentScope, html`<p>Standardinhalt</p>`)}`;
  }
}
customElements.define('app-info-dialog', InfoDialog);

const info = new InfoDialog();
document.body.append(info);
const closed = info.open();
await info.updateComplete; // Ohne Scope: „Standardinhalt“.

// Ersetzt während derselben Öffnung den bisherigen Inhalt.
info.contentScope = scopeDefine({
  title: 'Hinweis für Ada',
  $tpl: prolit_html`<h2>{{ title }}</h2>`,
});
await info.updateComplete; // Anzeige: „Hinweis für Ada“.

// Eine spätere Rücksetzung löst den alten Scope und zeigt wieder den Fallback:
info.contentScope = undefined;
await info.updateComplete; // Wieder „Standardinhalt“; alter Scope ist getrennt.
await closed; // Benutzer schließt über die vorhandene Nextrap-Oberfläche.
info.remove();
