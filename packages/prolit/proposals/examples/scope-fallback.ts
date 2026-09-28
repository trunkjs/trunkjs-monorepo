// 09 Unabhängige Varianten: Ersetzt jeweils nur den Einfügeaufruf aus 01.
const fallback = html`<p>Standardinhalt</p>`;
const validScope = scopeDefine({
  title: 'Ada',
  $tpl: prolit_html`<h2>{{ title }}</h2>`,
});
const brokenScope = scopeDefine({
  $tpl: prolit_html`<h2>{{ missingUser.name }}</h2>`,
});

// Jeweils eine Zeile ersetzt den render()-Aufruf aus 01; target stammt von dort.
render(prolit(validScope, fallback), target);            // <h2>Ada</h2>
render(prolit(undefined, fallback), target);             // Standardinhalt
render(prolit({ title: 'nur Daten' }, fallback), target); // Standardinhalt: kein Scope
render(prolit(undefined), target);                       // leer (Lit nothing)
render(prolit(brokenScope, fallback), target);            // Prolit-Fehlerhinweis + Diagnose
// Auch mit fallback bleibt ein Templatefehler sichtbar; kein Standardinhalt.

// Der zweite Parameter ist ein gewöhnlicher Lit-Wert, kein verzögerter Callback.
// prolit(validScope, createFallback()) würde createFallback() trotzdem ausführen.
// Der Fallback soll daher nebenwirkungsfreier Inhalt sein.
