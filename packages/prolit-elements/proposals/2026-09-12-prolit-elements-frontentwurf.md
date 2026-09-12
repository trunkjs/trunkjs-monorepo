# Prolit Elements Frontentwurf

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-12 | dermatthes | §§ 1–9: Konzept, Bestandsanalyse und alternative API-Beispiele angelegt |
| 2026-09-12 | dermatthes | § 1, §§ 3–6, §§ 8–10: Scope-Verträge vereinheitlicht, Fehler und Abbruch präzisiert, SPA-Kernbeispiele aus Bibliotheks- und Anwendungssicht ergänzt |

## § 1 Ziel und Lesereihenfolge

Eine Komponente zeigt in einer Datei ihre Daten, Aktionen, Startbedingungen und ihr HTML. **Eine Ziel-API für Tabelle, Suche und Dialog:** lokale Werte stehen direkt im Scope, lesbare Remote-Daten in `scopeResource`, asynchrone Aktionen unter `$fn` in `scopeAction`. Beide Async-Bausteine verwenden `pending`, `error` und denselben Ergebnisvertrag. Die Beispiele stellen keine konkurrierenden API-Varianten mehr zur Wahl. [geändert]

Dies bleibt ein **API-Entwurf**, keine Implementierung und keine lauffähige Demo. Dateien außerhalb von `src/`, neue Exporte und neue Semantik sind ausdrücklich markiert. Service-Implementierungen fehlen absichtlich. Das zusätzliche Komfortverhalten muss im Kern implementiert werden; die aktuelle Bibliothek kann diese Beispiele noch nicht unverändert ausführen.

| Einstieg | Kernfrage |
|---|---|
| [Beispielübersicht mit Gegenbeispielen](examples/README.md) | Welches Muster passt, wo endet sein Nutzen? |
| [Minimales Laden](examples/user-table-resource.ts) | Wo starten Anfrage, Laden, Fehler und Retry? |
| [Vollständige User-Tabelle](examples/user-table.ts) | Wie öffnet eine Aktion den Dialog und aktualisiert danach die Liste? |
| [User-Dialog](examples/user-edit-dialog.ts) | Wie bleiben Eingaben bei Fehlern erhalten? |
| [Suche](examples/user-search.ts) | Was geschieht bei schnellen, konkurrierenden Requests? |
| [Details](examples/user-details.ts) | Wie steuert ein Parent die Komponente ohne gemeinsamen Zustand? |
| [Live-Daten](examples/live-users.ts) | Wer beendet eine Subscription? |
| [Service-Typen](examples/user-api.ts) / [Framework-Vergleich](framework-vergleich.md) | Welche Grenzen und Alternativen gibt es? |

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

`ProlitElement extends LitElement` ist die vorgeschlagene Rendering-Basis. **`scopeDefine({ $this: this, ... })` besitzt dagegen den Scope-Lifecycle für jeden Lit-Host**, auch eine vorhandene Nextrap-Basisklasse. Dazu registriert es genau eine interne Lifecycle-Anbindung am Host, ohne dass der Anwendungsentwickler Controller verdrahten muss. `ProlitElement` führt Hooks nicht nochmals aus. Dies schließt die bisher offene Frage, warum Ressourcen auch in einem Nextrap-Dialog aktualisiert und beendet werden. [geändert]

| Bereich | Besitzer | Sichtbarer Anschluss |
|---|---|---|
| Daten, Aktionen, Lifecycle | Scope pro Instanz | `scopeDefine({ $this: this, ... })` |
| optionales Shadow-Gerüst | Lit-Unterklasse | `render()` mit Default-Slot |
| eigener Light-DOM-Bereich | `ProlitElement` | `scope.$tpl` |
| Nextrap-Hülle und Dialogergebnis | vorhandene `NteDialogComponent` | `show`, `open`, `submit`, `abort` |
| Inhalt innerhalb vorhandener Basis | Anwendungs-Unterklasse | `renderDialog() { return this.scope.$tpl.render(); }` |

`ProlitElement` reserviert einen eigenen Light-DOM-Container und überschreibt keine externen Host-Kinder. Mit Shadow DOM wird dieser Bereich durch `<slot></slot>` projiziert; `render()` bleibt ausschließlich das Gerüst. `static shadow = false` deaktiviert den Shadow-Renderer vollständig. Ein zweiter Lit-Renderer auf dem gesamten Host wäre kein gleichwertiger Ersatz. Tabellen werden vollständig in diesem Container gerendert; lose Tabellenzeilen, Layout-Wrapper und Slot-Zuordnung sind ausdrücklich zu berücksichtigen. [geändert]

**Kein automatischer Netzwerkstart durch Deklaration oder Rendern.** Ressourcen starten ausschließlich mit `reload(...)`, Aktionen ausschließlich mit ihrem Aufruf. `$hooks.$connect` zeigt den Startpunkt für den Host-Lifecycle; `open(input)` den Startpunkt des Dialogs. Ein vorheriges `$init` plus impliziter Ressourcenstart ist nicht mehr Teil der empfohlenen API. [geändert]

| Zeitpunkt | Verbindliche Reihenfolge |
|---|---|
| Konstruktion | neuen Scope binden, Deskriptoren registrieren; keine Abfrage, kein Hook vor Abschluss der Unterklassenfelder |
| Connect | Host als aktiv markieren; `$connect` einmal für diese Verbindung ausführen; synchron zurückgegebene Cleanup-Funktion merken |
| Update | Lit-Gerüst bzw. Nextrap-Hülle rendern; danach verwalteten Prolit-Bereich aktualisieren |
| Disconnect | Host inaktiv markieren; laufende Reads invalidieren/abbrechen; Cleanup genau einmal ausführen |
| Reconnect | Verbindung neu aktivieren; `$connect` erneut ausführen; keine zweite Subscription aus der alten Verbindung |

`$connect` ist synchron und darf `void scope.users.reload()` aufrufen oder eine Cleanup-Funktion zurückgeben. Ein Promise ist hier unzulässig: asynchrone Fehler gehören zu Ressourcen/Aktionen. Scope-Bindung an einen bereits verbundenen Host plant den Hook nach Abschluss der aktuellen Konstruktion ein. `updateComplete` umfasst beide DOM-Bereiche, aber wartet nicht auf Netzwerkzugriffe. Before-/After-Hooks werden bis zu einem konkreten Anwendungsfall nicht als zusätzlicher Startmechanismus beworben. [geändert]

## § 4 Scope, Typen und Template-Auswertung

Feste Lesereihenfolge: **Daten → `$fn` → `$hooks` → `$tpl`**. Ein Service-Aufruf steht genau bei der Ressource oder Aktion, die ihn besitzt. Ein Template-Aufruf zeigt auf `$fn`; nur dieser Callback entscheidet über Folgeschritte. Beispiel: `$fn.edit(user.id)` öffnet `UserEditDialog.show({ userId })` und lädt nur nach `submitted` neu. Keine automatische Invalidierung durch Namenskonventionen oder globale Stores. [geändert]

| Zugriff von außen | Bedeutung |
|---|---|
| `element.scope.users.data` | aktuell bekannte Daten |
| `element.scope.users.pending` / `.error` | Zustand des Lesens |
| `element.scope.$fn.edit('42')` | typisierte Aktion starten |
| `element.scope.$fn.edit.pending` / `.error` | Zustand genau dieser Aktion |
| `details.scope.$fn.select('42')` | Eingabe ändern und die dazugehörige Abfrage auslösen |

`scopeAction` liefert eine aufrufbare Funktion mit Zustandsproperties. Damit bleibt `$fn.save()` ein normal lesbarer Callback-Aufruf; kein zusätzliches `.run()` in jedem Template. Einfache synchrone Funktionen bleiben normale Funktionen und erhalten keine unnötigen Statusfelder. Die wenigen selbstreferenziellen Callback-Wrapper annotieren ihren Rückgabetyp, damit `this.scope` keine zirkuläre Typinferenz auslöst. Event-only Wrapper liefern `void`; wer das Ergebnis benötigt, verwendet die Ressource oder die umhüllte Aktion direkt. Generics müssen Parameter, Ergebnisse und optionale Eingaben erhalten; ein breiter `any`-Index darf Tippfehler nicht akzeptieren. Template-Strings selbst sind weiterhin ohne zusätzliche Werkzeuge nicht TypeScript-geprüft. [geändert]

Lokale Primitive und Arrays stehen direkt im Scope. Oberste Zuweisungen lösen ein gebündeltes Update aus; Änderungen an Arrays/Objekten verwenden neue Wurzelwerte. Ressource/Aktion meldet interne Statusänderungen selbst an den Host. Das ist kein Deep-Proxy. Ein Formular besitzt einen separaten `draft`; abgeleitete reine Werte wie Summen können im Template oder einem synchronen Callback berechnet werden. [geändert]

`$event` wird lokal an den Eventhandler übergeben. `currentTarget.value` wird synchron gelesen, bevor ein Promise gestartet wird. Vorgeschlagen sind zwei klare Handlerformen: direkter Ausdruck (`$fn.save()`) oder synchrones `preventDefault()` plus abschließender Callback. Der Compiler muss dessen Promise erfassen, auch beim Submit mit mehreren Statements; ein generierter parameterloser Handler, der den Promise-Wert verwirft, erfüllt den Vertrag nicht. Unbehandelte Callback-Fehler gehen in die technische Fehlerroute aus § 5.4. [geändert]

## § 5 Einheitliche Async-API statt konkurrierender Varianten

### § 5.1 Lesen mit `scopeResource`

`scopeResource({ load: ({ signal }, ...args) => Promise<T>, errorMessage, retainData? })` beschreibt eine lesende Operation. `reload(...args)` übergibt die fachlichen Parameter; den ersten Kontextparameter mit `AbortSignal` liefert Prolit. Jeder Aufruf nennt seine Parameter explizit: `user.reload(userId)`, `users.reload(query)`. Keine versteckten Abhängigkeiten auf beliebige Scope-Felder, kein automatisches Dependency-Tracking. [geändert]

| Feld / Verhalten | Vertrag |
|---|---|
| `data` | `T` oder `undefined`, kein automatisch entpacktes Array |
| `pending` | vor dem ersten Aufruf synchron `false`, ab Aufruf synchron `true` |
| `error` | `ScopeError` oder `null`; startet je Versuch bei `null` |
| `retainData` | standardmäßig `true`; `false` leert Daten sofort beim neuen Versuch, etwa für neue Such-/Detailparameter |
| `reload(...args)` | `Promise<ScopeResult<T>>`; startet ausschließlich verbunden, sonst `cancelled/disconnected` ohne Request |
| Konkurrenz | neuester Versuch gewinnt; alter Versuch wird invalidiert und nach Möglichkeit abgebrochen |
| Disconnect | alte Ergebnisse und Statusänderungen werden auch bei ignoriertem Abort-Signal nicht übernommen |

Bereits erfolgreiche Daten dürfen bei einem fehlgeschlagenen Refresh sichtbar bleiben; gleichzeitig erscheint die Fehlermeldung. Suche und wechselnde User-Details setzen `retainData: false`, damit keine Daten des vorigen Parameters als neue Treffer erscheinen. Der Aufrufer kann anhand des Ergebnisses weitere Schritte ausdrücklich an Erfolg binden. [geändert]

### § 5.2 Aktionen mit `scopeAction`

`scopeAction({ run: (...args) => Promise<T>, errorMessage })` bündelt eine fachliche Aktion, beispielsweise Speichern oder das Öffnen eines Dialogs. Der Rückgabewert ist aufrufbar und besitzt ebenfalls `pending` und `error`. Die Aktion startet nie automatisch. Anders als Reads werden laufende Writes nicht durch einen neueren Klick ersetzt: Ein zweiter Aufruf derselben Aktion liefert `cancelled/busy`, ohne `run` nochmals auszuführen und ohne den laufenden Status zu verändern. [geändert]

`pending` wird synchron vor `run` gesetzt und nach Abschluss zurückgesetzt. Das verhindert doppelte Requests auch vor dem nächsten DOM-Update. Die Aktion erzeugt keinen globalen Cache, keine automatische Listenaktualisierung und keine Write-Retries. Nach einem Save darf eine separate Lesefehler-Meldung nicht suggerieren, der bereits abgeschlossene Save sei fehlgeschlagen. Das zeigt [user-table.ts](examples/user-table.ts). [geändert]

### § 5.3 Ein Ergebnisvertrag für beide Bausteine

Die folgenden Typen sind **vorgeschlagen**, keine vorhandenen Exporte. Ressourcen und Aktionen fangen Ablehnungen ihrer Loader/Callbacks und liefern einen diskriminierten Ergebniswert; Aufrufer dürfen Erfolg nicht allein aus `await` ableiten. [neu]

```ts
interface ScopeError {
  message: string;       // developer-provided public message
  cause: unknown;       // original cause for diagnostics, never render automatically
}
type ScopeResult<T> =
  | { status: 'success'; data: T }
  | { status: 'error'; error: ScopeError }
  | { status: 'cancelled'; reason: 'superseded' | 'disconnected' | 'busy' };
```

Ein neuer Action-Aufruf auf einem getrennten Host liefert `cancelled/disconnected`, ohne `run` zu starten. Ein überholter oder getrennter Read liefert `cancelled` und setzt keinen Fehler. Die aktuelle Operation behält die alleinige Kontrolle über ihre Statusfelder. Ein normal abgebrochener Dialog liefert weiterhin das existierende Nextrap-Ergebnis `{ submitted: false }`; das ist ein erfolgreicher Abschluss der Öffnungsaktion ohne Save, kein technischer Fehler. Writes werden durch Disconnect weder zurückgerollt noch als garantiert abgebrochen bezeichnet. Eine laufende Aktion liefert nach ihrem tatsächlichen Abschluss ihr tatsächliches Ergebnis; fachliche Callbacks prüfen vor späteren DOM-Aktionen `isConnected`. [neu]

### § 5.4 Fehler sind sichtbar und haben genau einen Besitzer

| Fall | Zustand / Reaktion | Verantwortlich |
|---|---|---|
| Laden schlägt fehl | `resource.error`, lesbare Meldung und expliziter Retry im Template | Ressource und ihr eigener UI-Bereich |
| Speichern schlägt fehl | `$fn.save.error`, Draft bleibt unverändert, erneut Speichern möglich | Save-Aktion / Dialog |
| Refresh nach Save schlägt fehl | Listenfehler, kein erneuter Save | Tabelle |
| Dialog wird abgebrochen | `submitted: false`, kein Reload | aufrufende Aktion |
| Read ist überholt / Host entfernt | `cancelled`, keine Fehlermeldung | Ressourcen-Lifecycle |
| Template-/Programmierfehler | originale Ursache und Scope-/Ausdruckskontext diagnostizieren; kontrollierter Render-Fallback | Prolit-Diagnostik |

`errorMessage` ist Pflicht bei beiden Async-Deskriptoren. Jeder Fehler wird einmal mit der originalen Ursache an die technische Diagnose gegeben; nur die kontrollierte `message` wird im UI angezeigt. Keine globalen Toasts zusätzlich zur lokalen Fehlermeldung, keine vertraulichen Serverdetails im Template, kein leerer Catch. Der vorgeschlagene technische Kanal ist ein `scope-error`-Event am Host mit Kontext; für Dev-Diagnose bleibt `cause` zugänglich. Die konsumierende App darf damit eigenes Logging verbinden. [neu]

`scope.$tpl.render()` muss Compiler-/Renderfehler an derselben Grenze erfassen und einen festen zugänglichen Fehlerhinweis als Lit-TemplateResult zurückgeben. Dadurch gilt die Fehlergrenze auch beim direkten Einsatz in `NteDialogComponent`; sie hängt nicht von `ProlitElement` ab. Unbehandelte Fehler gewöhnlicher Eventcallbacks werden mit dem betroffenen Ausdruck gemeldet und als allgemeiner Aktionsfehler im verwalteten Bereich angezeigt; sie dürfen keine unhandled Rejection hinterlassen. Ein fehlerhafter Diagnose-Listener darf keine rekursive Fehlerkaskade auslösen. [neu]

Betriebsfehler, Validierungsfehler und Programmierfehler sind nicht automatisch anhand eines beliebigen geworfenen Objekts unterscheidbar. Die erste API verwendet deshalb eine kontrollierte Meldung plus unveränderte Ursache. Feldbezogene Servervalidierung, Offline-Outbox und Konfliktauflösung sind ausdrücklich noch nicht durch diesen kleinen Vertrag gelöst. [neu]

## § 6 User-Dialog mit Nextrap

Die vorhandene [NteDialogComponent](https://github.com/nextrap/nextrap-monorepo/blob/85cfd2edb07b6d885ca78b685e89c954775d3545/nextrap-elements/nte-dialog-component/src/lib/nte-dialog-component.ts) behält Hülle, Mounting und Ergebnis-Promise. `UserEditDialog extends NteDialogComponent<UserEditInput, User>` verwendet dieselbe Scope-API wie eine Tabelle. `renderDialog()` liefert nur `scope.$tpl.render()`; weder doppelte Vererbung noch ein zusätzlicher Dialogmanager sind erforderlich. [geändert]

`show({ userId })` erstellt eine neue Instanz. `open(input)` delegiert zuerst an `super.open(input)`, damit `this.input` gesetzt ist, und startet dann sichtbar `$fn.load()`. Dieser lädt die Ressource und setzt den separaten Draft nur bei `result.status === 'success'`. Ein abgebrochener oder überholter Read kann somit nicht nachträglich einen Draft setzen. Die Wiederverwendung derselben Nextrap-Instanz über mehrere Öffnungen bleibt außerhalb des Beispiels. [geändert]

Der Scope besitzt keine parallelen `loading`, `loaded` oder `saving`-Flags. `user.pending`, `user.error`, `$fn.save.pending` und `$fn.save.error` gehören den jeweiligen Operationen; `draft === null` bedeutet, dass noch kein bearbeitbarer Entwurf vorliegt. Einzig `closing` ist eigener Workflow-Zustand: Save oder Abbrechen ist entschieden, während Nextrap noch schließt. Diese Unterscheidung verhindert weitere Writes während der Schließanimation. [geändert]

Native `required`-/E-Mail-Validierung findet vor Submit statt. Der Handler verhindert Navigation und ruft `$fn.save()` auf. Save erhält eine Kopie des Drafts; ein Fehler lässt Draft und Dialog erhalten. **Load-Retry wird nur bei Load-Fehlern angeboten.** Bei Save-Fehlern wird erneut gespeichert; der alte gemeinsame Fehlerzustand mit „Neu laden“ hätte hier ungesicherte Eingaben überschreiben können. Direkte TypeScript-Aufrufe von `$fn.save()` durchlaufen die Browservalidierung nicht; fachliche Validierung bleibt Aufgabe des Services. [geändert]

`scopeAction` sperrt einen zweiten Save synchron. Der eigene Cancel-Callback prüft `save.pending || closing`. Für die bestehende Nextrap-Hülle bleibt ein kleiner expliziter Adapter nötig: Ein Capture-Listener am Dialog-Host fängt `dismiss` vor dem Nextrap-Handler ab und führt jeden Benutzer-Abbruch durch denselben Cancel-Callback. Dieser setzt `closing` vor `abort()`, damit auch während einer Abbruch-Schließanimation kein Save mehr starten kann. `willUpdate()` setzt zusätzlich die sichtbaren Dismiss-Optionen. Damit wird die zuvor nur dokumentierte Lücke vor dem nächsten Render tatsächlich im Beispiel adressiert. Der Listener hängt nur am eigenen Host, nicht global. [geändert]

Ein direkter externer Aufruf von `close()`, `abort()` oder das Entfernen der Komponente ist kein normaler Benutzer-Dismiss. Der Service kann dann trotzdem bereits geschrieben haben. Das Beispiel prüft nach dem Save `isConnected` vor dem Submit; es verspricht keine Rückabwicklung. Diese Grenze muss eine SPA beim Navigieren während eines Writes berücksichtigen. Styles bleiben über öffentliche Nextrap-Sass-Mixins Aufgabe der App/des Themes; Prolit injiziert keine Light-DOM-Styles. [geändert]

## § 7 Sicherheit, Fehlertoleranz und Entwicklerkomfort

Templates sind ausführbarer Anwendungscode: Der Compiler verwendet `new Function` und `with`; Scope ist keine Sandbox. Nicht vertrauenswürdiges HTML darf nicht als Prolit-Template kompiliert werden. Daten werden über den Scope übergeben, niemals über `${serverValue}` in `prolit_html` zu Quelltext verkettet. Reguläre Lit-Textbindung ist von explizit gefährlichen Sinks wie `.innerHTML` zu unterscheiden.

Eine strenge CSP ohne dynamische Codeauswertung ist mit dem aktuellen Runtime-Compiler nicht vereinbar. Optionales Vorcompilieren ist deshalb eine sinnvolle spätere Betriebsart. Fehlertoleranz heißt kontrollierte Meldungen und definierte Fallbacks; Syntaxfehler oder fehlgeschlagene Saves dürfen nicht still verschwinden. Wiederholte Attribute desselben Namens können beim Einlesen eines DOM-`<template>` bereits verloren sein; die Beispiele vermeiden doppelte strukturelle Attribute.

## § 8 Empfohlene Reihenfolge

Die Ziel-API ist jetzt einheitlich; die vollständige Tabelle und das Minimalbeispiel zeigen denselben Vertrag in unterschiedlichem Umfang. Die frühere Variante mit manuell gepflegten Ladeflags bleibt als Gegenbeispiel in der [Beispielübersicht](examples/README.md) nachvollziehbar. [geändert]

1. Scope-/Proxy-Bindung, Renderer-Rückgabetyp, `$event` und Promise-Fehlergrenze konsistent machen.
2. Scope-Lifecycle an beliebige Lit-Hosts binden; `ProlitElement` nur für die getrennten Renderbereiche ergänzen.
3. `scopeResource` und `scopeAction` mit exakt § 5 implementieren, einschließlich Typinferenz und Konkurrenzregeln.
4. Minimalbeispiel, Suche, Dialog und Disconnect/Reconnect als reale Integration abnehmen.
5. Erst bei konkretem Bedarf Debounce-Helfer, Feldvalidierung, globale Caches oder Vorcompilierung ergänzen.

## § 9 Prüfung und noch offene Abnahme

Prüfergebnis: sieben TypeScript-Dateien bestehen die Syntaxprüfung; sechs Templates bestehen den vorhandenen `Html2AstParser`. Lokale Dokumentlinks und der Abgleich zwischen Beispielen, Lifecycle- und Fehlervertrag wurden ebenfalls geprüft. Ein grüner Repository-CI-Lauf prüft vorhandene Pakete, bestätigt aber nicht die Laufzeit der unimplementierten Entwurfs-API. [geändert]

`ProlitElement`, `scopeResource`, `scopeAction`, `$connect` samt Cleanup, `$event` und der korrigierte Render-Rückgabetyp fehlen im geprüften Ausgangsstand. Ein vollständiger Typ-/Browsernachweis dieser API ist deshalb noch offen. Es werden keine Ersatzimplementierungen oder Casts eingeführt, die das verschleiern. Die frühere Browserprüfung scheiterte zusätzlich am fehlenden Browser-Binary; diese Revision verwendet die verfügbare Syntax-/Parserprüfung. [geändert]

Abnahme nach Implementierung: zwei unabhängige Instanzen, kein Request pro Render, richtige Startreihenfolge bei Connect/Open, Cleanup/Reconnect, A/B-Antwortreihenfolge einschließlich ignoriertem Abort-Signal, leere Ergebnisse, getrennte Load-/Save-Fehler, Save-Doppelklick, Dismiss im selben Task vor dem Lit-Update, Erhalt des Drafts, Navigation während eines Writes, Fokus/Validierung und korrekte Callback-Generics. Konkrete Erwartungen stehen in der Szenarientabelle. [geändert]

## § 10 Gegenprüfung aus beiden Entwicklerperspektiven

| Entscheidung | Bibliotheksentwickler: Was muss der Kern leisten? | Anwendungsentwickler: Was sehe ich unmittelbar? |
|---|---|---|
| expliziter Start | keine versteckten Fetch-/Render-Effekte | der eine Startaufruf steht im Hook, in `open` oder im Event |
| Ressource + Aktion | zwei kleine Mechanismen mit gemeinsamen Fehler-/Status-Typen | Daten lesen und etwas auslösen haben verschiedene Namen, aber gleiche Zustandswörter |
| callable `$fn` | Funktionsparameter plus Zustand präzise inferieren | `$fn.save()` aufrufen, `$fn.save.pending` anzeigen |
| `ScopeResult` | alle Abbruch-/Fehlerpfade vollständig behandeln | nur `success` führt zu einem abhängigen Folgeschritt |
| Parent-/Child-Grenze | Scope pro Instanz, keine globale Namensauflösung | ID hinein, typisiertes Ergebnis oder DOM-Event heraus |
| Live-Stream | Cleanup nach jedem Disconnect garantieren | Subscribe und Unsubscribe stehen im selben kleinen Block |
| Nextrap-Adapter | bestehende Dialogrechte respektieren | ein sichtbarer Rest an Lifecycle-Code statt einer versteckten zweiten Dialogbasis |

Diese Gegenprüfung verschiebt Komplexität nur dort in Prolit, wo sie sich zuverlässig wiederverwenden lässt. Subscription-Transport, Servervalidierung, Berechtigungen, Router und gemeinsame Caches sind eigene fachliche Grenzen. Die Beispiele zeigen diese Grenzen ausdrücklich; sie behaupten keine universelle SPA-Lösung. [neu]
