// 10a Bibliotheksseite: möglicher Adapter im Nextrap-Paket @nextrap/nte-prolit.
// Die Imports zeigen hier die Architekturgrenze; Paketname und Klasse sind vorgeschlagen.
import { nextrap_element } from '@nextrap/nt-core';
import { withProlitLightDom } from '@trunkjs/prolit-elements';
import { prolit, scopeDefine, prolit_html, type ProlitScope } from '@trunkjs/prolit';
import { html } from 'lit';

abstract class NextrapProlitElement extends withProlitLightDom(nextrap_element()) {
  static override properties = { shadowScope: { attribute: false } };
  declare public shadowScope?: ProlitScope;

  protected override render() {
    return html`${prolit(this.shadowScope, html`<slot></slot>`)}`;
  }
}

// 10b Anwendungsseite: in der App würde diese Basis aus @nextrap/nte-prolit importiert.
// Eigenständige Alternative zu 02b; verwendet die in 10a definierte Basis.
class UserWelcome extends NextrapProlitElement {
  // Projektkonvention: useDefineForClassFields: false erhält den Lit-Property-Setter.
  public override lightScope = scopeDefine({
    name: 'Ada',
    $fn: { rename: (): void => { this.lightScope.name = 'Ada Lovelace'; } },
    $tpl: prolit_html`
      <p>Willkommen, {{ name }}.</p>
      <button type="button" @click="$fn.rename()">Vollständiger Name</button>
    `,
  });
}
customElements.define('app-user-welcome', UserWelcome);
const welcome = new UserWelcome();
document.body.append(welcome);
await welcome.updateComplete;
// Default-Slot im Shadow DOM zeigt „Willkommen, Ada.“ aus dem Light DOM.
// Klick: „Willkommen, Ada Lovelace.“; Hooks/Fehler bleiben beim selben Scope-Vertrag.

// Ergänzt denselben Ablauf um ein Prolit-Gerüst; der Light-Scope bleibt eingebunden.
welcome.shadowScope = scopeDefine({
  title: 'Benutzerverwaltung',
  $tpl: prolit_html`<h2>{{ title }}</h2><slot></slot>`,
});
await welcome.updateComplete;
// Ergebnis: zusätzlicher Shadow-Titel „Benutzerverwaltung“, gleicher Light-DOM-Inhalt.
