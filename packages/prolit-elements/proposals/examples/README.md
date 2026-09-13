# Prolit-Beispiele: vom Scope zum sichtbaren Inhalt

**Anwendungsausschnitte, keine eigenständig lauffähigen Demos.** Die verwendete TrunkJS-API ist jetzt implementiert und durch Unit-/Typ-Tests abgesichert. Service-Implementierungen und die in 10 vorgeschlagene Nextrap-Komfortbasis fehlen weiterhin bewusst. Diese Kennzeichnung und die Import-Konvention gelten für die ganze Reihe. Jede Nummer steht für eine Leserfrage; die Dateien sagen, ob sie einen Ablauf ergänzen oder ersetzen. Man führt sie nicht der Reihe nach als gemeinsame Anwendung aus.

## 01 Benutzer laden, auswählen und anzeigen

[user-table-resource.ts](user-table-resource.ts) zeigt den vollständigen ersten Ablauf: Ziel anlegen, Scope definieren, Template einhängen, Daten laden, Auswahl anzeigen. `userApi` kommt aus der Service-Schicht der Anwendung; [user-api.ts](user-api.ts) definiert einmal ihre Signaturen und Beispieldaten: Ada (`42`) und Linus (`84`). Eine Backend-Implementierung wird nicht vorausgetäuscht.

Die Namen im ersten Beispiel stammen aus diesen Imports. Die TS-Ausschnitte wiederholen sie nicht:

```ts
import { render } from 'lit';
import { scopeDefine, prolit_html, prolit, scopeResource } from '@trunkjs/prolit';
import { userApi, type User } from './user-api';
```

Die entscheidende Verbindung steht nach dem Scope und seinem Template:

```ts
const part = render(prolit(scope), target);
const result = await scope.users.reload();
```

`target` ist der zuvor angelegte `<section>`-Knoten. `prolit(scope)` bindet dessen Lit-Inhaltspunkt an genau diesen Scope. Erst danach startet der Read. Die Seite zeigt Ada und Linus; ein Klick auf Ada setzt `scope.selectedName` und zeigt „Ausgewählt: Ada“. Ein Ladefehler erscheint am selben Ort und bietet „Neu laden“ an. Es gibt keinen Request nur aufgrund einer Template-Auswertung.

**Eine Regel für alle folgenden Beispiele:** Direkte Scope-Zuweisungen und Ressourcen-/Aktionszustände aktualisieren den gebundenen Inhalt. Ein Scope allein hat keinen Renderort. `$this`, eine DOM-Suche oder ein Prolit-spezifischer Dialog sind dafür nicht erforderlich.

## 02 Wo liegt der Inhalt: Shadow DOM, Light DOM oder vorhandener Host?

[scope-placement.ts](scope-placement.ts) ersetzt in 02a nur den Renderaufruf aus 01: Derselbe Scope wird als Inhalt einer vorhandenen Komponente eingesetzt. Neu hinzu kommen `html`, `nothing` und `LitElement` aus `lit`; die Anwendung registriert den Dialog über `@nextrap/nte-dialog`. Öffnen und Ergebnis folgen in 03.

02b zeigt den Sonderfall einer eigenen Komponente mit zwei unabhängigen DOM-Bereichen. Dafür steht `withProlitLightDom` aus `@trunkjs/prolit-elements` bereit. Das Mixin verwaltet nur den zusätzlichen Light-DOM-Root. Der normale `render()`-Aufruf bleibt sichtbar beim Shadow-Scope:

```ts
protected override render() {
  return html`${prolit(this.shadowScope)}`;
}
```

| Anschluss | Sichtbares Ergebnis | Zuständigkeit |
|---|---|---|
| `` html`<nte-dialog>${prolit(scope)}</nte-dialog>` `` | Inhalt ist Kind von `nte-dialog` | vorhandener Lit-Inhaltspunkt; kein Mixin |
| `render()` mit `prolit(shadowScope)` | „Verwaltung“ im Shadow Root | normaler Lit-Host |
| Mixin mit `lightScope` | Ada und Button im verwalteten Light-DOM-Bereich | zusätzlicher Root samt Lifecycle |
| `<slot>` im Gerüst | Light-DOM-Inhalt wird angezeigt | Projektion; die Knoten bleiben im Light DOM |

Das Mixin benötigt einen Shadow Root. Auf einem Host, dessen `createRenderRoot()` bereits `this` zurückgibt, würden sich zwei Light-DOM-Renderer überschneiden; dieser Fall wird diagnostiziert. Die Scope-Property des Mixins ist reaktiv. Ihre Feldinitialisierung verwendet hier die bestehende Projektkonvention `useDefineForClassFields: false`; bei nativer Define-Semantik verwendet eine Unterklasse `declare` und eine Zuweisung im Konstruktor, um den geerbten Setter zu erhalten.

02c ergänzt das Entfernen aus 01: `part.setConnected(false)` meldet den Disconnect, bevor Inhalt und Ziel entfernt werden. Nur den DOM-Knoten zu löschen genügt bei einem manuell verwalteten Lit-Root nicht zuverlässig. LitElement beziehungsweise Mixin melden die Verbindung ihrer eigenen Roots; die Directive führt die Scope-Hooks aus.

Jeder Scope besitzt höchstens eine aktive Einbindung. Zwei Bereiche verwenden zwei Scopes; zwei Komponenteninstanzen erzeugen ebenfalls eigene Scopes. Eine TrunkJS-Basisklasse ist für keinen der Wege erforderlich. Die optionale Nextrap-Komfortbasis wird erst in 10 eingeführt.

## 03 Benutzer in einem Nextrap-Dialog bearbeiten

[user-edit-dialog.ts](user-edit-dialog.ts) ist ein eigener Ablauf mit dem Dienst aus 01. Zusätzlich verfügbar sind `scopeAction` aus `@trunkjs/prolit`, `NteDialogComponent` aus `@nextrap/nte-dialog-component` sowie `UserDraft` und `UserEditInput` aus `./user-api`.

Oben stehen `contentScope`, Felder, Laden, Ändern und Speichern; darunter steht das Formular. Die vorhandene Nextrap-Basis erhält genau diesen Inhalt:

```ts
protected override renderDialog() {
  return html`${prolit(this.contentScope)}`;
}
```

`html` erhält den von Nextrap verlangten `TemplateResult`-Rückgabetyp. Nextrap setzt das Ergebnis in das Light DOM seines inneren `nte-dialog`. Die Directive benötigt weder einen eigenen Dialogtyp noch Zugriff auf einen übergeordneten Scope.

`UserEditDialog.show({ userId: '42' })` erzeugt die Instanz und setzt ihre Eingabe vor dem ersten Rendern. Beim Mount startet `$connect` den Read; erst ein erfolgreiches Ergebnis erzeugt den separaten Draft. Nach Änderung des Namens und Save liefert das Dialog-Promise den gespeicherten User „Ada Lovelace“. Abbrechen liefert `{ submitted: false }`.

**Fehler zeigen unterschiedliche nächste Schritte:** Load-Fehler → erneut laden; Save-Fehler → Eingaben bleiben erhalten, erneut speichern. Ein gemeinsamer Retry mit Neuladen würde beim Save-Fehler den Draft gefährden. Während Save sperrt das Formular seine Controls. Der kleine Capture-Listener führt Nextraps Benutzer-Dismiss durch denselben synchronen Cancel-Guard; Scope-Updates müssen dafür nicht erst die äußere Dialoghülle neu rendern.

Grenze: Diese Komponente wird einmal über `show` geöffnet. Externes Entfernen kann einen schon gestarteten Server-Write nicht zurücknehmen. Der Save prüft vor dem späteren `submit` die Verbindung. Browservalidierung greift beim Formular-Submit; direkte TypeScript-Aufrufe brauchen weiterhin fachliche Servicevalidierung.

## 04 Die Tabelle öffnet diesen Dialog

[user-table.ts](user-table.ts) verwendet die **Klasse** `UserEditDialog` aus 03; dessen separaten `show`-Demostart übernimmt man nicht. In einer Anwendung wird die Klasse aus ihrem Modul importiert. Der neue Ablauf ist vollständig an einer Stelle sichtbar:

```ts
const result = await UserEditDialog.show({ userId });
if (result.submitted) await this.lightScope.users.reload();
```

Die Tabelle ist ein normales `LitElement`. Diese beiden Methoden legen ihren einzigen Renderbereich fest:

```ts
protected override createRenderRoot() { return this; }
protected override render() { return html`${prolit(this.lightScope)}`; }
```

Damit liegt die ganze Tabelle im Light DOM ihres Hosts. Es gibt keinen zusätzlichen Root und keinen Mixin-Bedarf; `lightScope` ist hier ein instanzeigenes Feld, dessen Inhalt direkt von der Directive aktualisiert wird. Suche, Details und Live-Anzeige verwenden anschließend denselben Anschluss.

„Bearbeiten: Ada“ öffnet das Formular. Nach Save aktualisiert die Tabelle ihre Daten; Abbrechen lässt sie unverändert. `scopeAction` verhindert einen zweiten parallelen Dialog. Ein fehlgeschlagener Refresh gehört zu `users.error`; die Oberfläche darf deshalb keinen erneuten Save verlangen.

## 05 Optionalen Scope von außen setzen: ProlitAware

[prolit-aware.ts](prolit-aware.ts) ersetzt den festen Benutzerinhalt aus 03 durch einen austauschbaren Inhalt. Hier kommt der Typ `ProlitAware` aus `@trunkjs/prolit` hinzu. `ProlitScope` ist der opake Scope-Typ aus `@trunkjs/prolit`, nicht die vorhandene gleichnamige Elementklasse aus `prolit-elements`.

```ts
interface ProlitAware {
  contentScope?: ProlitScope;
}
```

Das Interface beschreibt den Zugang für TypeScript. Die Komponente macht `contentScope` zu einer reaktiven Lit-Property und verwendet einmal `prolit(this.contentScope, defaultContent)` an ihrem Inhaltspunkt. Damit kann die **Directive** automatisch prüfen, ob der übergebene Wert ein Scope ist. Ein `implements` allein aktiviert zur Laufzeit nichts.

Das Beispiel öffnet zunächst „Standardinhalt“, setzt von außen einen Scope und zeigt „Hinweis für Ada“. Eine Rücksetzung auf `undefined` trennt den bisherigen Scope und zeigt wieder Standardinhalt. Scope-Wechsel braucht ein Host-Update; Änderungen **im** eingebundenen Scope aktualisieren direkt seinen Inhalt. Lit-Ausdrücke außerhalb dieses Bereichs erhalten dadurch kein automatisches Host-Update.

## 06 Suche: die neueste Anfrage gewinnt

[user-search.ts](user-search.ts) ist eine unabhängige Variante der Tabelle. Statt eines Connect-Reads startet die Eingabe sichtbar `users.reload(query)`. `retainData: false` entfernt Treffer des alten Suchbegriffs.

Eingabe „Ad“, dann „Ada“: Auch wenn „Ad“ später antwortet, bleiben ausschließlich die Treffer für „Ada“ maßgeblich. Ein `AbortSignal` allein reicht dafür nicht; Prolit muss überholte Ergebnisse invalidieren. Ein Request pro Eingabe ist hier gewollt sichtbar. Debounce wäre eine zusätzliche Entscheidung am Auslöser; bei teuren Abfragen kann ein Submit-Button geeigneter sein.

## 07 Details aus Parent oder Route auswählen

[user-details.ts](user-details.ts) ersetzt das Suchfeld durch `details.lightScope.$fn.select('42')`. Vor dem Einfügen merkt die Aktion die ID; der noch ungebundene Read liefert `cancelled/disconnected` ohne Request. `$connect` lädt anschließend die gemerkte Auswahl.

Auswahl `42` zeigt Ada; ein späteres `select('84')` leert die alten Details und lädt Linus. Ein Router kann genau denselben Aufruf verwenden. `selectedId = '84'` allein startet keinen Request. URL-History und Navigation bleiben Aufgaben des Routers; ein Child muss seinen Parent nicht kennen.

## 08 Live-Daten und Entfernen

[live-users.ts](live-users.ts) verwendet einen Push-Dienst anstelle eines einmaligen Reads. `$connect` startet die Subscription und gibt direkt ihre Stop-Funktion zurück. Nach dem ersten `updateComplete` ist die Verbindung hergestellt; beim Entfernen läuft Cleanup genau einmal. Erneutes Einfügen startet eine neue Subscription.

Servicewert `2` ergibt „Aktive Benutzer: 2“. Ein Stream-Fehler kennzeichnet den Wert als möglicherweise veraltet. Bereits eingeplante späte Callbacks werden durch `active` ignoriert. Ein Transport-Reconnect oder automatischer Retry ist kein Teil dieser Scope-Regel. Scheitert schon das synchrone Subscribe-Setup, muss der Service seine bis dahin erworbenen Ressourcen selbst freigeben.

## 09 Fallback ist keine Fehlerbehandlung

[scope-fallback.ts](scope-fallback.ts) definiert gültige und defekte Scopes und ersetzt jeweils nur den `render`-Aufruf aus 01. Jede Aufrufzeile ist eine eigenständige Variante.

| Erster Parameter | Ergebnis |
|---|---|
| gültiger Scope mit Ada | dessen Template zeigt Ada |
| `undefined` oder normales Datenobjekt | zweiter Parameter: „Standardinhalt“ |
| kein Scope, kein zweiter Parameter | leer, entsprechend Lit `nothing` |
| gültiger Scope mit `missingUser.name` | sichtbarer Prolit-Fehlerhinweis und Diagnose; kein Standardinhalt |

Die Scope-Kennung wird zur Laufzeit geprüft. Sie beweist weder die Fehlerfreiheit des Templates noch die Vertrauenswürdigkeit seiner Quelle. Ein fehlendes `contentScope` ist normal; ein Tippfehler in einem vorhandenen Template muss erkennbar bleiben. Der zweite Parameter ist ein gewöhnlicher Lit-Wert, kein verzögerter Callback: `createFallback()` würde als Funktionsargument auch bei gültigem Scope ausgeführt. Fallback-Inhalte sollten deshalb keine Requests oder sonstigen Nebeneffekte auslösen.

## 10 Nextrap kann seinen eigenen Prolit-Komfort anbieten

[nextrap-prolit-element.ts](nextrap-prolit-element.ts) beantwortet eine Bibliotheksfrage: Wo liegt eine Basis, die Nextrap-Konventionen mit Prolit verbindet? Der erste Abschnitt gehört als Vorschlag in ein eigenes Nextrap-Paket `@nextrap/nte-prolit`; der zweite zeigt die Anwendung dieser Basis. Die Imports stehen hier ausdrücklich dabei, weil ihre Richtung das Lernziel ist.

`NextrapProlitElement` kombiniert das vorhandene `nextrap_element()` aus `@nextrap/nt-core` mit dem implementierten Light-DOM-Mixin. Sein eigener Renderer bindet optional den Shadow-Scope ein und bietet sonst einen Default-Slot. Die Anwendung definiert in `UserWelcome` ihren Light-Scope: „Willkommen, Ada.“ wird per Button zu „Willkommen, Ada Lovelace.“. Die anschließende Zuweisung eines Shadow-Scopes ergänzt die Überschrift „Benutzerverwaltung“, ohne den Light-Scope neu zu verbinden.

**Der Architekturvertrag ist gerichtet:** Nextrap-Integration verwendet TrunkJS; TrunkJS importiert Nextrap weder als Laufzeitcode noch über öffentliche Typen oder Reexports. Nextrap-Core importiert die optionale Integration ebenfalls nicht zurück. `ProlitAware` bleibt im Kern und ist nicht an Nextrap gebunden. Die gemeinsame Scope-Kennung, Fehlergrenze und Hook-Ausführung gehören weiterhin der Directive.

Die Anwendung kann diese Komfortbasis wählen oder bei der direkten Einbindung bleiben. Bestehende Dialoge verwenden weiterhin `NteDialogComponent` und `renderDialog()` aus 03; sie erben nicht zusätzlich von dieser Basis. Der [Paketvertrag in § 3.5](../2026-09-12-prolit-elements-frontentwurf.md#-35-architekturvertrag-integration-hängt-vom-kern-ab) beschreibt erlaubte und unzulässige Abhängigkeiten.

Die Datei liegt zur Begutachtung hier unter `proposals/examples/`, gehört aber nicht zum TrunkJS-Paketcode oder dessen Exports. Der vorgeschlagene Nextrap-Adapter ist noch nicht implementiert; das TrunkJS-Mixin ist verfügbar. Die spätere Nextrap-Abnahme muss auch `dependencies`, `peerDependencies` und erzeugte TypeScript-Deklarationen auf Rückabhängigkeiten prüfen.

## Grenzen desselben Musters

Diese Ergänzungen sind Ausschnitte aus dem jeweils genannten Kontext, keine weiteren eigenständigen Abläufe.

| Aufgabe | Kleinster passender Schritt | Grenze |
|---|---|---|
| Lokale Liste erweitern | im Scope `items = [...items, newItem]` | `items.push(...)` allein garantiert kein Update; keine tiefe Reaktivität |
| Summen / lokale Filter | reiner `$fn.total()`-Callback | keine `scopeAction` für einfache Berechnungen; große Datenmengen können Memoisierung oder Virtualisierung brauchen |
| Pagination + Sortierung | wie 06: `users.reload({ page: 1, sort: 'name' })` mit passend typisiertem App-Service | Query als unveränderten Request-Snapshot behandeln; Gesamtzahl und Cursor gehören zum Service |
| Geteilte Daten | derselbe explizite Service für getrennte Scopes | kein globaler Scope und keine implizite Cache-Invalidierung |
| Upload / Navigation während Save | Fortschritt und Verlassen-Regel als Fachzustand ergänzen | Abbruch garantiert kein serverseitiges Rollback |
| Offline / optimistische Anzeige | eigener Konflikt-/Versionsvertrag | kein automatischer Write-Retry nach Timeout; der erste Write kann schon erfolgt sein |
| Komplexe Formulare | Feldfehler und Dirty-Tracking explizit modellieren | `required`/`type=email` ersetzen keine Servervalidierung |
| Template-Typen / CSP / SSR | zusätzliche Compiler- oder Betriebsart | generische Scopes prüfen HTML-Ausdrücke nicht; Runtime-Codegenerierung bleibt eine Grenze |

**Gegenprobe beim Lesen:** Ist erkennbar, wo der Scope gerendert wird, wodurch eine Aktion startet, wer das Ergebnis übernimmt und wo der Fehler erscheint? Für den Bibliotheksentwickler folgt daraus ein konkreter Mount-/Cleanup-/Fehlervertrag; für den Anwendungsentwickler bleibt der fachliche Ablauf am Scope und Template lesbar. Die Kernverträge werden jetzt in den Paket-Tests geprüft. Die beschriebenen Anwendungsabläufe bleiben zusätzlich Abnahmekriterien für eine ausführbare SPA-/Nextrap-Integration.
