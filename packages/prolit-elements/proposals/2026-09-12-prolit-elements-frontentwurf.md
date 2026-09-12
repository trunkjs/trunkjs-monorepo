# Prolit Elements Frontentwurf

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-12 | dermatthes | §§ 1–9: Konzept, Bestandsanalyse und alternative API-Beispiele angelegt |

## § 1 Ziel und Lesereihenfolge

Eine Komponente soll auf einen Blick zeigen: welche Daten sie besitzt, welche Aktionen sie anbietet und welches HTML sie rendert. Prolit bleibt eine HTML-nahe Template-Schicht über Lit. Anwendungszustand, Funktionen und gegebenenfalls Datenressourcen stehen gemeinsam im typisierten Scope; zusätzliche Klassenfelder für dieselben Daten entfallen. Ein Scope ist ein Objekt; Arrays wie `users` und `fields` liegen darin.

Dies ist ein **API-Entwurf**, keine Implementierung und keine lauffähige Demo. Die TypeScript-Dateien liegen bewusst außerhalb von `src/` und werden nicht in die bestehenden Demo-Einstiegspunkte eingebunden. Neue Exporte und Semantik sind ausdrücklich als Vorschläge markiert. Backend-Aufrufe sind ausschließlich Signaturen; ihre Implementierung ist nicht Teil dieses PRs.

1. [Explizite Tabelle](examples/user-table.ts): Daten, Ladezustand und Callbacks sind unmittelbar sichtbar.
2. [Tabelle mit Datenressource](examples/user-table-resource.ts): weniger manuelle Zustandsverwaltung; empfohlenes Ziel für Web-Service-Daten.
3. [Eigene User-Dialogkomponente](examples/user-edit-dialog.ts): beide Tabellen öffnen denselben Dialog.
4. [Datentypen und Service-Grenze](examples/user-api.ts): keine Fetch-/Persistenzimplementierung.
5. [Separater Framework-Vergleich](framework-vergleich.md): Stärken, Schwächen und Prioritäten.

## § 2 Aktueller Stand und belastbare Befunde

Geprüfter Quellstand: TrunkJS `ad4ba6a392ae470fa4b6d5abcc483e70733fbe32`, Nextrap `85cfd2edb07b6d885ca78b685e89c954775d3545`. Die Paketnummer allein ist kein Reifegradnachweis. Die folgende Bewertung beruht auf Quellcode und vorhandenen Tests, nicht auf einem vollständigen Laufzeitaudit.

### § 2.1 Vorhandener Ablauf

`prolit_html` erzeugt ein `ProLitTemplate`. Beim ersten Rendern wird der HTML-String in einen AST und daraus in eine JavaScript-Funktion übersetzt; diese verwendet `with($scope)` und Lit-Funktionen. Weitere Aufrufe derselben Template-Instanz verwenden die kompilierte Funktion erneut. Es wird kein Lit-Quellmodul erzeugt: Die Funktion liefert zur Laufzeit ein Lit-TemplateResult, das Lit in DOM umsetzt.

| Baustein | Schon vorhanden | Grenze |
|---|---|---|
| `Html2AstParser` / `Element2Function` | `{{ }}`, `*for`, `*if`, `*do`, `*catch`, `*log`, `.property`, `?boolean`, `@event`, `~class`, `~style` | Eigene Syntax und Codegenerierung benötigen eigene Diagnostik und Tests |
| `scopeDefine<T>` | generischer Rückgabewert, `$fn`, `$this`, `$update`, `$raw`, `$rawPure`, Template-Bindung | offener `any`-Index; Proxy beobachtet nur direkte Zuweisungen |
| `ProLitTemplate` | `render()`, zwei DOM-Renderhelfer, Cache pro Instanz | Rückgabetyp des generierten Renderers fälschlich `string`; zwei nahezu identische DOM-Methoden |
| `ProlitScope` | `<prolit-scope>`, externe/inline Templates, `init`, Light DOM, Übernahme benannter Inputs | konkrete `ReactiveElement`-Komponente, keine entworfene Dual-DOM-Basisklasse |
| Fehlerbehandlung | Syntaxprüfung und Fehlerkontext; `*catch` kann Fehler abfangen | Fehler werden gemeldet/abgefangen, nicht automatisch korrigiert; Quellpositionen unzuverlässig |

Quellen: [Scope](../../prolit/src/lib/scopeDefine.ts), [Template](../../prolit/src/lib/ProLitTemplate.ts), [Compiler](../../prolit/src/parser/Element2Function.ts), [Lit-Umgebung](../../prolit/src/lib/lit-env.ts), [ProlitScope](../src/components/prolit-scope/prolit-scope.ts).

### § 2.2 Konkrete Lücken vor einer stabilen API

- `$hooks` und `$on` sind in `ScopeDefinition` beschrieben, werden in den geprüften Kern-/Elementdateien aber nicht ausgeführt. `$ref`-Code wird generiert, obwohl die Lit-Umgebung `ref` nicht bereitstellt.
- `@event` erzeugt einen parameterlosen Handler: Ein lokales `$event` fehlt. Das synchrone `catchError` erfasst außerdem keine späteren Promise-Rejections asynchroner Callbacks.
- Der Proxy setzt Daten auf dem Originalobjekt; die Template-Bindung kann ebenfalls auf diesem Originalobjekt liegen. Template-Ausdrücke umgehen damit unter Umständen die Proxy-Update-Benachrichtigung. `$update()` bleibt für tiefe Mutationen wie `items.push(...)` ohnehin nötig. Das ist noch kein konsistenter reaktiver Vertrag.
- Die Demo `test-component1.ts` erstellt den Scope auf Modulebene. Mehrere Instanzen teilen Daten und überschreiben `$this`; der neue Ansatz muss zwingend pro Instanz einen Scope erzeugen.
- `ProlitScope.updated()` erstellt bei jedem Aufruf eine neue Listener-Funktion. `removeEventListener` mit dieser neuen Referenz entfernt die zuvor registrierte Funktion nicht. Eine stabile Listener-Referenz und Disconnect-Bereinigung fehlen.
- `src`-Änderungen lösen in `updated()` keinen eigenen Reload aus. Initialisierung kann sowohl über Connect als auch über die erste Property-Aktualisierung starten; Template-Neukompilierung und konkurrierende Initialisierung sind nicht konsistent geregelt.
- Die Input-Übernahme verwendet pauschal `.value` und flache Namen. Checkboxen, Mehrfachauswahl, verschachtelte Daten und eigene Komponenten brauchen explizite Regeln; automatische breite DOM-Suche darf nicht fremde Kindkomponenten auslesen.
- `ProLitTemplate.getCompiledTemplate()` parst vor `prolit_compile()` und damit zweimal. `prolit_html` verkettet `${...}` direkt zu Template-Quelltext. Das ist keine sichere Lit-Werteinterpolation.
- Typdeklarationen und README verwenden teilweise noch `tj-html-scope`, obwohl `prolit-scope` registriert wird. Generics prüfen JavaScript in HTML-Strings nicht automatisch.

Diese Punkte werden in diesem PR dokumentiert, nicht nebenbei repariert. Die vorhandenen Directive-Tests zeigen viele Einzelbausteine; beispielsweise rendert der Event-Test nach dem Klick explizit erneut und belegt somit keine automatische Aktualisierung einer realen Komponente.

## § 3 Komponenten- und DOM-Vertrag

Vorgeschlagen wird **`ProlitElement extends LitElement`** aus `@trunkjs/prolit-elements`. Jede Instanz definiert `scope = scopeDefine({ ... })`; der bestehende Funktionsname bleibt erhalten. Ein zusätzlicher Alias `createScope` würde zunächst nur eine zweite Schreibweise schaffen. Der Basistyp darf die konkrete Inferenz von `scope.$fn` in Unterklassen nicht durch eine breite Feldannotation ersetzen.

| Bereich | Besitzer | Aufgabe |
|---|---|---|
| `render()` / Shadow Root | Lit und die abgeleitete Klasse | optionales Komponentengerüst, standardmäßig `<slot></slot>` |
| eigener Light-DOM-Renderbereich | `ProlitElement` | `scope.$tpl` auswerten und mit Lit aktualisieren |
| Daten und Aktionen | instanzeigener Scope | Anwendungsdaten und `$fn` bündeln |
| Dialoghülle und Ergebnis | Nextrap | Mounting, Öffnen, Schließen, `show()`-Promise |
| Dialogformular | `UserEditDialog` | Laden eines Users, lokaler Entwurf, Speichern |

Die Basisklasse reserviert einen eigenen Light-DOM-Container; sie darf nicht die gesamten Host-Kinder durch einen zweiten Renderer ersetzen. Bei aktiviertem Shadow DOM wird dieser Bereich durch den Default-Slot projiziert. Vorhandene externe Kinder bleiben erhalten, werden aber nicht automatisch Bestandteil des Scope-Templates oder der Formularsynchronisation. Der zusätzliche Container und seine Layout-Auswirkungen sind ein bewusster Entwurfsparameter; Tabellen werden als vollständige `<table>` im Container gerendert, nicht als lose `<tr>` unter einem `<div>`.

Vorgeschlagene Option: `static shadow = false` rendert ausschließlich den verwalteten Light-DOM-Bereich. In diesem Modus wird `render()` nicht als zweiter Host-Renderer ausgeführt. Mit Shadow DOM verwaltet Lit das Gerüst, Prolit den separaten Light-DOM-Bereich. Ein Override von `createRenderRoot() { return this; }` ist für den Dual-Renderer-Modus ausdrücklich kein zulässiger Ersatz.

Die Basis bindet Scope und Template konsistent an den Proxy, bündelt Updates und rendert Light DOM nach der Lit-Aktualisierung. `$hooks.$init` läuft einmal pro Instanz nach Connect, nachdem die Unterklassenfelder existieren. Die definierten Before-/After-Hooks erhalten eine dokumentierte Reihenfolge; Async-Init blockiert die Anzeige des Ladezustands nicht. Disconnect entfernt Listener und stoppt Ressourcen; Reconnect registriert sie genau einmal. `updateComplete` muss beide synchronen DOM-Aktualisierungen umfassen, aber nicht auf offene Netzwerkabfragen warten.

## § 4 Scope, Typen und Template-Auswertung

Die Beispiele definieren erst Daten und Funktionen, darunter `$tpl` in derselben TypeScript-Datei. Callbacks sind Arrow-Funktionen und greifen über `this.scope` auf den tatsächlichen Proxy zu. Der Scope ist kein Singleton. `$fn.edit(userId)` bleibt sowohl im Template lesbar als auch aus TypeScript über `element.scope.$fn.edit('42')` zugänglich.

Ziel der Generics: Nutzdaten, Callback-Parameter und Promise-Ergebnisse bleiben exakt erhalten; erforderliche Systemfelder wie `$update` und ein übergebenes `$tpl` dürfen nicht unnötig optional werden. Tippfehler wie `scope.$fn.edti(...)` und falsche Parametertypen sollen TypeScript-Fehler sein. Der offene `any`-Index sollte dafür von der streng typisierten Anwendungs-API getrennt werden. Keine Pseudo-Typsicherheit durch bloße Casts auf `ScopeDefinition`.

Die Werte `user.name` oder `$fn.edit(user.id)` innerhalb von Template-Strings bleiben ohne zusätzliches Compiler-/Editor-Tooling ungeprüft. Kurzfristig: gute Laufzeitdiagnosen mit originalen Positionen. Später: optionaler Template-Typcheck; dieser ist nicht Voraussetzung für einen kleinen ersten API-Schritt.

Zuweisungen an oberste Scope-Felder lösen ein gebündeltes Update aus. Tiefe Änderungen verwenden zunächst einen neuen Wurzelwert, wie im Dialog `draft = { ...draft, [name]: value }`. Ein transparenter Deep-Proxy wäre eine gesonderte Entscheidung mit Regeln für Arrays, Klassen, Maps und Identität. Der Entwurf behauptet nicht, dies bereits zu bieten.

`$event` wird als lokaler Parameter des erzeugten Eventhandlers bereitgestellt, nicht dauerhaft auf dem Scope gespeichert. So bleibt `currentTarget` während des synchronen Handlerteils verfügbar. Callback-Promises benötigen eine explizite Fehlerroute; synchrones `try/catch` genügt nicht. Lesen im Template darf keine Requests starten oder Daten ändern: Servicezugriff gehört in Scope-Callbacks oder eine deklarierte Ressource, nicht in `*do` während jedes Renderns.

## § 5 Zwei API-Varianten für die User-Tabelle

### § 5.1 A – explizite Callbacks

[user-table.ts](examples/user-table.ts) bleibt nahe an `scopeDefine`: `users`, `loading`, `error`, `$fn.reload`, `$fn.edit`. Nach erfolgreichem Dialog wird genau der gespeicherte User im Array ersetzt. Das ist leicht nachvollziehbar und benötigt keine neue Datenabstraktion. Nachteil: Lade-/Fehlerzustände und wiederholtes `try/finally` werden manuell gepflegt. Für einen ersten Basisklassen-Prototyp ist das der kleinste Schritt.

### § 5.2 B – deklarierte Datenressource

[user-table-resource.ts](examples/user-table-resource.ts) definiert die Abfrage direkt als `users: scopeResource(({ signal }) => userApi.list({ signal }))`. Das ist der empfohlene Zielkomfort für Daten aus Web Services: `users.data`, `users.pending`, `users.error` und `users.reload()` bilden einen gemeinsamen, sichtbaren Vertrag. Keine zusätzliche `usersLoading`-/`usersError`-Zustandsverwaltung in der Komponente.

**`scopeResource` existiert noch nicht.** Vorgeschlagener Vertrag:

| API | Typ / Verhalten |
|---|---|
| `scopeResource<T>(loader)` | instanzeigene, zunächst inaktive Ressource; `T` aus Promise inferiert |
| `data` | `T \| undefined`; alter erfolgreicher Wert bleibt während Reload erhalten |
| `pending` | `boolean`; Ressource besitzt und aktualisiert den Wert |
| `error` | `unknown \| null`; kein automatisches Anzeigen interner Serverfehler |
| `reload()` | `Promise<void>`; startet neuen Versuch, Fehler werden in `error` erfasst |
| Loader-Argument | `{ signal: AbortSignal }` |
| Connect / Disconnect | Start nach Scope-Bindung; Abort und Entfernen der Update-Verbindung bei Disconnect |
| Konkurrenz | neuester Versuch gewinnt; auch ohne beachtetes Abort-Signal keine alten Ergebnisse übernehmen |
| Reconnect | abgebrochenen Erstversuch neu starten, erfolgreiche Daten erhalten; Refresh explizit |

`scopeDefine` erkennt Ressourcen-Deskriptoren und verbindet deren interne Zustandsänderungen mit dem Host-Update. Diese Verbindung ist notwendig, weil der heutige flache Proxy Änderungen an `users.data` nicht beobachtet. Eine Ressource ist ein Objekt und kein verdeckt automatisch entpacktes Array. Deshalb ist `users.data ?? []` im Template ausdrücklich sichtbar. Der Reload nach erfolgreichem Speichern lädt die serverseitige Sortierung/Filterung neu; ein abgebrochener Dialog lädt nichts neu.

Parameterabhängige Ressourcen, globaler Cache, Retry-Strategien und Optimistic Updates bleiben spätere Erweiterungen. Für den gezeigten festen List-Endpunkt braucht es sie nicht. Variante B verlangt mehr Bibliotheksarbeit als A, reduziert dafür wiederkehrende Anwendungsarbeit.

## § 6 User-Dialog mit Nextrap

Verwendet wird die vorhandene [NteDialogComponent](https://github.com/nextrap/nextrap-monorepo/blob/85cfd2edb07b6d885ca78b685e89c954775d3545/nextrap-elements/nte-dialog-component/src/lib/nte-dialog-component.ts), nicht das ältere experimentelle `DialogMixin`. `UserEditDialog extends NteDialogComponent<UserEditInput, User>` erbt bereits `show`, `open`, `submit` und `abort`. Die bestehende Basisklasse rendert ihre `nte-dialog`-Hülle im Light DOM; das primitive `nte-dialog` kümmert sich um den nativen Dialog.

Eine Mehrfachvererbung mit `ProlitElement` ist weder nötig noch möglich. Hier verwendet `renderDialog()` direkt `scope.$tpl.render()`. Dies ist der zweite Integrationsweg: die gleiche Scope-/Template-API innerhalb einer vorhandenen Komponentenbasis. Es entsteht keine zusätzliche eigene Dialog-Basisklasse. `render()` der Nextrap-Basis bleibt unverändert und behält die Kontrolle über ihre Hülle.

Der Aufruf `UserEditDialog.show({ userId })` erzeugt eine neue Instanz. Das gezeigte `open()` setzt die Eingabe und startet den Loader, bevor es an `super.open(input)` delegiert. Das Template zeigt Laden und Fehler. Die öffentliche Wiederverwendung derselben Dialoginstanz über mehrere `open()`-Aufrufe wird hier nicht zugesichert; der geprüfte Nextrap-Code behält sein Ergebnis-Promise.

`fields` beschreibt die Formularelemente; `draft` enthält nur editierbare Daten. Das Beispiel verwendet native Inputs mit verschachteltem Label, `required` und `type="email"`; keine neuen Input-Komponenten oder Formularbibliotheken. Der normale Submit erhält Browservalidierung, verhindert über `$event.preventDefault()` die Navigation und ruft den Scope-Callback auf. Der Callback ersetzt den Draft auf Eingabe, speichert eine Kopie und ruft erst bei Erfolg `submit(savedUser)` auf. Bei Fehler bleibt der Dialog mit dem Entwurf offen. Fehlgeschlagenes Laden lässt die Bearbeitung gesperrt; Abbrechen speichert nichts.

Während des Speicherns werden auch Escape, Close-Button und Backdrop über `dialogOptions.dismiss = false` gesperrt. Diese Option wird in `willUpdate()` vor dem Rendern der Nextrap-Hülle gesetzt; `renderDialog()` bleibt ohne Seiteneffekte. Nach erfolgreichem `submit()` bleibt `saving` bis zum Entfernen der Instanz aktiv, damit während der asynchronen Schließanimation kein zweites Speichern möglich ist. Eine spätere Implementierung muss den kurzen Zeitraum vor dem nächsten Lit-Update ebenfalls gegen konkurrierendes Dismiss absichern; das UI-Flag allein ist kein atomarer Request-Abbruch.

Nextrap-CSS bleibt Verantwortung der Anwendung bzw. des Themes. Die Klassen `size-lg` und `with-shadow` setzen voraus, dass die öffentlichen Sass-Mixins eingebunden sind. Dieser Entwurf schreibt weder in das Nextrap-Repository noch ändert er Abhängigkeiten von Prolit Elements.

## § 7 Sicherheit, Fehlertoleranz und Entwicklerkomfort

Templates sind ausführbarer Anwendungscode: Der Compiler verwendet `new Function` und `with`; Scope ist keine Sandbox. Nicht vertrauenswürdiges HTML darf nicht als Prolit-Template kompiliert werden. Daten werden über den Scope übergeben, niemals über `${serverValue}` in `prolit_html` zu Quelltext verkettet. Reguläre Lit-Textbindung ist von explizit gefährlichen Sinks wie `.innerHTML` zu unterscheiden.

Eine strenge CSP ohne dynamische Codeauswertung ist mit dem aktuellen Runtime-Compiler nicht vereinbar. Optionales Vorcompilieren ist deshalb eine sinnvolle spätere Betriebsart. Fehlertoleranz heißt kontrollierte Meldungen und definierte Fallbacks; Syntaxfehler oder fehlgeschlagene Saves dürfen nicht still verschwinden. Wiederholte Attribute desselben Namens können beim Einlesen eines DOM-`<template>` bereits verloren sein; die Beispiele vermeiden doppelte strukturelle Attribute.

## § 8 Empfohlene Reihenfolge

1. Scope-/Proxy-Bindung, Renderer-Rückgabetyp, Eventparameter und asynchrone Fehlerbehandlung konsistent machen.
2. `ProlitElement` mit instanzeigenem Scope, getrennten DOM-Bereichen und definiertem Lifecycle umsetzen; Variante A als erste echte Integrationsdemo.
3. Nextrap-Dialoganbindung mit derselben Scope-/Template-API zeigen; kein zusätzlicher Dialogmanager.
4. Nach Freigabe von Semantik und Namensgebung `scopeResource` für Variante B ergänzen.
5. Diagnostik und optionale Vorcompilierung verbessern; breiteres Framework-/Tooling erst bei konkretem Bedarf.

## § 9 Prüfung und noch offene Abnahme

Prüfergebnis: Vier TypeScript-Dateien bestehen die Syntaxprüfung mit Node 24 (TypeScript-Transformation und Modulparser); alle drei Prolit-Templates bestehen den vorhandenen `Html2AstParser`. Imports und verwendete APIs wurden mit den öffentlichen Einstiegspunkten und dem Quellcode abgeglichen. Die vollständige Compiler-/Browserprüfung konnte wegen des fehlenden Playwright-Browser-Binaries nicht ausgeführt werden. Ein vollständiger Typcheck gegen heutige Pakete kann nicht erfolgreich sein: `ProlitElement` und `scopeResource` fehlen absichtlich, `$event` ist nicht verfügbar und `ProLitTemplate.render()` ist falsch typisiert. Es werden keine Ersatzimplementierungen oder Casts eingeführt, um diese Lücken zu verstecken.

Für die spätere Implementierung sind zwei gleichzeitige Instanzen, Disconnect/Reconnect, kein Request pro Render, veraltete Request-Ergebnisse, Load-/Save-Fehler, Abbrechen ohne Mutation, unveränderte DOM-Identität bei List-Updates, sämtliche Dismiss-Wege und exakte `$fn`-Typen die wesentlichen Abnahmeszenarien. Diese Aufzählung ist keine Behauptung bereits bestandener Laufzeittests.
