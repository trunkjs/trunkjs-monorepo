# Router, Prolit und Scope: Datenfluss, Lebenszyklen und interne Qualität

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-29 | dermatthes | §§ 1–10: interne Bestandsaufnahme, Zielverträge, Refactoring-Reihenfolge und Abnahmematrix angelegt |

## § 1 Umfang und Bewertungsmaßstab

Dieses Proposal ergänzt den [API-Entwurf](2026-09-29-router-prolit-scope-api.md) und die [Ist-/Soll-Beispiele](../examples/08-router-scope-review.md). Analysierter Stand: `842245e5996e6d51ff4d1b3ca896a280b2c28506`. Es verändert keine Laufzeitimplementierung. Alle vorgeschlagenen internen Typen und Modulgrenzen sind Entwürfe.

Bewertet wurden Router-Registrierung, Matching, Navigation, Outlets und Mixins; direkte und strukturierte Scopes, Callback-Registries, Resources und Actions; Prolit-Directive, Template-Bindung und Codegenerierung; Hosts, der ältere HTML-Scope und Dialog-/Router-Adapter. Das ist eine paketübergreifende Architektur- und Codeanalyse, kein vollständiges Audit jeder Parserkante oder aller Browserzustände. Statische Beobachtungen werden von daraus abgeleiteten, noch zu reproduzierenden Risiken unterschieden.

Das Qualitätsziel ist nicht die maximale Zahl kleiner Dateien. Eine Zustandsänderung soll einen eindeutigen Auslöser, Eigentümer und sichtbaren Ausgang haben. Technische Arbeit darf gekapselt werden; fachliche Abhängigkeiten, Lebensdauer und Fehlerentscheidungen dürfen dadurch nicht verschwinden.

## § 2 Heutiger Ablauf und richtige Zuständigkeiten

### § 2.1 Vom Direktlink zum gerenderten Benutzer

Im heutigen Beispiel verläuft der erste Aufruf so: `Router.start()` matcht die Adresse; `#commit` setzt `current` und dispatcht `routechange`; `RouterContent` konstruiert das registrierte Element und hängt es ein; `withRouter.connectedCallback` bindet den Router und ruft bereits `onRouteChange` auf. Das Lit-Rendering aktiviert erst anschließend `prolit(scope)`. Die Directive ruft Scope-`connect` auf; der `$connect`-Hook startet den Read. Dessen Ergebnis löst eine gebündelte Benachrichtigung aus und aktualisiert den Lit-Part. Belege: [Router][router], [Outlet][outlet], [Mixin][with-router], [Directive][directive], [Runtime][runtime] und [Beispiel 03][example-route].

Das erklärt die zwei Ladepfade und den `#scopeConnected`-Merker. Ein Host-`connectedCallback`, ein Router-Commit und ein aktiver Scope sind drei unterschiedliche Ereignisse. `updateComplete` ist ebenfalls keine Zusage abgeschlossener Datenanfragen; der [Lit-Vertrag](https://lit.dev/docs/components/lifecycle/#updatecomplete) bezieht sich auf das Komponentenupdate.

### § 2.2 Ownership-Tabelle

| Eigentümer | Darf verwalten | Darf nicht implizit übernehmen |
|---|---|---|
| Router | Routenregister, bestätigte URL, Navigationstransaktion, History-Anbindung | HTTP-Cache, Entwurfsdaten, Prolit-Mount |
| Outlet / Route-View | Effektiver Kontext, Komponentenidentität, Austausch/Update, Disposal | Server-Rollback, fremde Outlet-Daten |
| Präsentationsrenderer | Wrapper, Dialog-Fokus, Darstellung und deren Freigabe | Scope kopieren, Business-Result erfinden, selbst History manipulieren |
| Prolit-Directive | Ein aktiver Lit-Part, Renderfehlergrenze, Scope-Verbindung | Requests aufgrund beliebiger Renderdurchläufe starten |
| Scope-Runtime | Aktivierung, Updates, Cleanup, Operationsbindung | URL auslesen oder DOM-Events als globale Fachereignisse interpretieren |
| Resource / Action | Jeweilige Operation, Status und Ergebniszuordnung | Fachliche Dirty-Entscheidung oder automatische Write-Wiederholung |
| Anwendung | Input-Mapping, DTO, Entwurf, Validierung, Entscheidung nach Erfolg | Generischen Abbruch-/Mount-Mechanismus erneut implementieren |

Ein optionaler Router-Prolit-Adapter vermittelt zwischen diesen Verträgen. Er wird nicht zum neuen Eigentümer aller Zustände. Das bewahrt die heutige sinnvolle Richtung Prolit → Renderer → Scope und die Unabhängigkeit des Routers.

## § 3 Ein präziseres internes Zustandsmodell

### § 3.1 Drei Identitäten statt eines allgemeinen `isConnected`

Für neue Integrationslogik werden drei getrennte Identitäten benötigt: eine Navigationstransaktion für überholte Navigationsentscheidungen, eine View-Identität für Route/Outlet/fachlichen Input und eine Scope-Aktivierungsepoche für jeden Connect-/Disconnect-Zyklus. Ein zusätzlicher Request-Zähler oder das vorhandene Attempt-Objekt identifiziert einzelne Reads. Diese Werte erfüllen unterschiedliche Aufgaben und dürfen nicht zu einem globalen „aktuell“-Flag zusammenfallen.

Ein Write kann zu Ende gehen, obwohl seine View nicht mehr existiert. Sein tatsächliches Ergebnis bleibt gültig; nur UI-Folgeeffekte für eine veraltete View werden verworfen. Ein Read, dessen Schlüssel inzwischen gewechselt wurde, darf dagegen seinen Datenwert nicht mehr veröffentlichen. Ein Dirty-Dialog, der eine ältere Navigation bestätigt, darf eine zwischenzeitlich neuere Entscheidung nicht überschreiben.

### § 3.2 Reads und Writes bleiben unterschiedliche Zustandsmaschinen

| Operation | Start | Überholung / Disconnect | Abschluss |
|---|---|---|---|
| Read | Nur aktiv und mit gültigem Auftrag | Vorigen Versuch sofort als `cancelled` beenden, Signal abbrechen, späte Ergebnisse ignorieren | Nur aktueller Versuch verändert `data/error/pending`. |
| Write | Aktiv; synchron sperren, damit auch zwei Aufrufe im selben Task nicht doppelt schreiben | Tatsächlichen Write nicht als abgebrochen ausgeben; keine automatische Wiederholung | Tatsächlichen Erfolg/Fehler zurückgeben, Sperre lösen; UI-Effekt separat auf View-Gültigkeit prüfen. |
| Navigation | Ziel auflösen und prüfen | Ältere Guard-Entscheidung entwerten | Erst freigegebenes Ziel committen; Datenbereitschaft bleibt separat. |
| Präsentation schließen | Schließabsicht bei Router/Guard anmelden | Bei Ablehnung Originalelement und Entwurf behalten | Nach Freigabe einmal entsorgen, keine zweite Navigation beim Cleanup. |

[Resource und Action][async] setzen die ersten beiden Grundverträge bereits weitgehend um. Eine Vereinheitlichung zu einem einzigen „AsyncTask“ darf diese Unterschiede nicht verwischen. Gemeinsame kleine Hilfen für Diagnose und Ergebnisformen sind möglich; konkurrierende Policy-Schalter für jeden Standardfall wären eine Verschlechterung.

### § 3.3 Scope-Aktivierung als kontrollierter Vertrag

Die heutige [ScopeRuntime][runtime] exportiert veränderbare interne Felder wie `binding`, `cleanup`, `revision` und `disconnectors`. Renderer und künftige Integrationen sollen stattdessen einen schmalen internen Vertrag erhalten: registrieren, aktivieren/deaktivieren, Änderung melden, Aktivierung beobachten und Diagnose senden. Ein Adapter braucht keine Schreibberechtigung auf beliebige Runtime-Felder.

Aktivierungsbeobachter dürfen `$connect` nicht erneut aufrufen. Ein `routeResource` merkt sich vor Aktivierung höchstens den letzten Schlüssel, startet bei Aktivierung einmal und bündelt weitere Schlüsseländerungen. Es darf dieselbe Resource nicht für einen zweiten Scope übernehmen. Ein Controller pro Host kann die Router-Subscription teilen; die Resource bleibt an den tatsächlichen Scope gebunden. Reines `hostConnected` wäre zu früh und würde den heutigen Fehler nur in die Bibliothek verschieben.

## § 4 Konkrete Codebefunde und vorgeschlagene Maßnahmen

### § 4.1 R01 — Mutable Route-Snapshots

**Beobachtung:** `RouteContext` ist als readonly beschrieben, enthält aber mutierbare `URL`, `URLSearchParams`, Metadaten und eine normalisierte Definition. `match` verwendet bei übergebenen URL-Objekten deren Referenz; `current` ist öffentlich beschreibbar. Ein Aufrufer kann damit Zustandsobjekte ändern, ohne die Navigation auszulösen. Beleg: [Router, RouteContext / match / #matchUrl][router].

**Vorschlag:** Öffentliche Snapshots vom privaten Routenregister trennen. Parameter und Metadaten kopieren; Query über eine readonly Leseoberfläche oder defensive Kopie anbieten. `Object.freeze(URLSearchParams)` allein verbietet deren mutierende Methoden nicht. Änderungen erfolgen über Navigationsmethoden, einschließlich des vorgeschlagenen Query-Patchs. `current` erhält eine kontrollierte readonly Oberfläche. Kosten: Kopien und gegebenenfalls öffentliche Typänderungen; nicht als unsichtbare Kleinigkeit migrieren.

### § 4.2 R02 — Nicht passende History-Adresse bei alter View

**Beobachtung:** `#commit` kehrt bei fehlendem Match mit `null` zurück und lässt die bisherige Route bestehen. Für einen abgelehnten programmatischen SPA-Aufruf ist „unverändert“ beabsichtigt; bei `popstate` ist die Browseradresse bereits eine andere. Daraus ergibt sich ein zu prüfendes URL-/View-Konsistenzrisiko. Beleg: [Router, #commit / #onPopState][router].

**Vorschlag:** Unmatched-Ziele vor programmatischem Commit weiter unverändert ablehnen; für bereits eingetretene Browser-Navigation eine ausdrücklich konfigurierte Not-found-/Reload-/Restore-Politik festlegen. Keinen erfundenen Match erzeugen und nicht die alte View kommentarlos unter neuer Adresse behalten. Die Browser-Anbindung erhält eine nachvollziehbare History-Transaktion, kein ad hoc History-Fixing im Element.

### § 4.3 R03 — Matching und Registrierung

**Beobachtung:** `#matchUrl` kompiliert reguläre Ausdrücke wiederholt; `#go` matcht vor History-Änderung, `#commit` danach erneut. `register` führt gleichnamige Routen mit gleichem Pfad zusammen, prüft dabei aber nicht sämtliche übrigen gemeinsamen Metadaten. So kann die Registrierungsreihenfolge etwa für Präsentation oder `closeTo` relevant werden. Belege: [Router][router] und [route-tools][route-tools].

**Vorschlag:** Pfadmatcher und Parameternamen einmal bei Registrierung kompilieren, Namensindex pflegen, Metadatenkonflikte früh melden. Ein bereits validiertes Match an die Commit-Stufe weitergeben. Auswertungsreihenfolge und erlaubte Mehrfachregistrierung bleiben ausdrücklich definiert; kein unbemerkter Wechsel zu einer anderen Match-Priorität. Ein Performancegewinn ist erst durch Messung belegt, nicht durch weniger sichtbare Funktionsaufrufe.

### § 4.4 R04 — Primärkontext und Auxiliary-Kontext

**Beobachtung:** Der Präsentationsrenderer bekommt effektive Auxiliary-Parameter; ein Inline-Element wird ohne entsprechenden Kontext konstruiert und `withRouter.params` liest grundsätzlich Primärparameter. Außerdem ist Inline-Reuse anders als Presentation-Reuse: Ein Primärparameterwechsel ersetzt Inline-Komponenten, kann aber eine präsentierte Instanz aktualisieren. Belege: [Outlet][outlet], [withRouter][with-router] und [Änderungsmengen][route-tools].

**Vorschlag:** Eine immutable `RouteViewContext`-Zuordnung pro konkreter View mit effektiven Parametern, Outlet, Primärkontext und stabiler View-Kennung. Vor Verbindung des Elements zuweisen. Globale `router.current` bleibt die gesamte Navigation, nicht der Ersatz für lokale View-Parameter. Reuse als eigene Policy behandeln; zunächst aktuelle Defaults erhalten, anschließend gezielt über Klassen-/Input-Identität konfigurierbar machen. Lifecycle und Dirty-Prüfung vor jeder tatsächlichen Identitätsänderung absichern.

### § 4.5 R05 — Async-Hooks und unvollständiges Disposal

**Beobachtung:** `onRouteChange` darf eine Promise liefern, wird im [Mixin][with-router] aber mittels `void` aufgerufen, ohne Rejection-Behandlung. `RouterContent.#dispose` ruft `forEach(view.dispose)` auf; eine werfende View kann die Bereinigung der übrigen abbrechen. Das sind konkrete Stellen, an denen Implementierer zusätzliche Fehlerbehandlung wissen müssen.

**Vorschlag:** Einen expliziten Aufrufvertrag für View-Hooks: synchron aufrufen, Rejections kontrolliert diagnostizieren, nicht das gesamte Routing bis zum HTTP-Ergebnis blockieren. Cleanup aller Views unabhängig versuchen und Fehler anschließend gebündelt melden. `dispose` idempotent machen. Root-/Connection-Cleanup darf nicht davon abhängen, dass der erste benutzerdefinierte Renderer fehlerfrei arbeitet.

### § 4.6 R06 — Guard und Dialog schließen in falscher Reihenfolge

**Beobachtung:** Der [Dialog-Adapter][dialog-adapter] ruft nach `open().then(...)` `context.close()` auf. [ProlitDialogElement][dialog-element] hat dann die Präsentation bereits geschlossen und entfernt. Der [Outlet-Code][outlet] erwartet zudem synchrone Navigationsrückgaben. [PR #41](https://github.com/trunkjs/trunkjs-monorepo/pull/41) beschreibt dagegen asynchrone Guard-Navigation. Der PR ist offen; dieser Befund beschreibt die notwendige Integration, nicht einen bereits gemergten Guard-Fehler.

**Vorschlag:** Schließabsicht und endgültiges Ergebnis/Disposal trennen. Der Router autorisiert die Schließ-Navigation vor der Entfernung. Bei Ablehnung bleibt derselbe Dialog offen; bei Navigation entsorgt der Outlet-Eigentümer ihn ohne erneute Schließ-Navigation. Alle `close`-/`replace`-Aufrufer auf das künftige Promise-Ergebnis umstellen. Dass die Methode asynchron wird, genügt nicht: Die Reihenfolge selbst muss sich ändern.

### § 4.7 S01 — Definition, State, DTO und Entwurf sind nicht dasselbe

**Beobachtung:** [defineReactiveScope][define] verwendet die übergebene Definition selbst als Proxy-Ziel und transformiert sie. `$raw` ist der Originalgegenstand, `$rawPure` entfernt nur Dollar-Felder auf oberster Ebene. Verschachtelte Referenzen und Resource-Objekte bleiben enthalten. Das [API-Beispiel][example-api] leert nach einem Write den aktuellen Entwurf, obwohl dieser währenddessen verändert worden sein kann.

**Vorschlag:** Definitionen konsequent pro Instanz erzeugen. Öffentliche Dokumentation trennt Konfiguration, lebenden State, Resource-Daten, editierbaren Entwurf und Request-DTO. Der Standardflow sendet etwa `{ name }`, nicht `$rawPure`. Formularfelder während des abschließenden Writes sperren oder eine Entwurfsrevision vergleichen; wiederverwendete View-Kontexte zusätzlich prüfen. Eine spätere Snapshot-Funktion benötigt eine explizite Auswahl-/Serialisierungspolitik und darf nicht Ressourcen oder Callbacks als Nutzdaten vortäuschen.

### § 4.8 S02 — Operationsbindung ohne Entbindung

**Beobachtung:** Resources binden sich an genau eine Runtime und registrieren einen Disconnector. Die Setter binden neue Operationen, Entfernen/Ersetzen besitzt aber keinen entsprechenden Entbindungsvertrag. Belege: [async.ownerBinding][async], [defineReactiveScope][define] und [runtime.disconnectors][runtime]. Daraus folgt ein Retentions- und Lebensdauer-Prüfauftrag; eine gemessene Speicherleckgröße wird nicht behauptet.

**Vorschlag:** Registrierungen erhalten einen internen Release-Handle. Beim Entfernen einer Resource deren Subscription freigeben und den aktuellen Read abbrechen; beim Entfernen einer laufenden Action nicht den realen Server-Write umdeuten. Deren Rückgabe und sichere Diagnose müssen bis zum Abschluss erhalten bleiben. Definitionseigentum, Aktivierung und Operationslebensdauer getrennt modellieren. Den Austausch innerhalb von `$fn` nicht als beliebig tief beobachtete Mutation darstellen: Aktuell werden Root-Werte und bekannte Callback-Gruppen bei Bindung verarbeitet, nicht jede spätere verschachtelte Mutation.

### § 4.9 S03 — Strukturierte Scope-Container haben überraschende Nebenwirkungen

**Beobachtung:** `ScopeArrayRuntime.at()` legt beim Lesen ein Element an; `first()` und `last()` können auf leerem Array ebenfalls erzeugen. Diese Erzeugung benachrichtigt nicht wie ein expliziter Value-Write. `ScopeProxyRuntime.setEntry` ersetzt einen Container ohne eigenes Notify-/Root-Rebinding. `ScopeValueRuntime` erstellt standardmäßig ein DOM-Element bzw. ein als HTMLElement behauptetes Fallback-Objekt. Beleg: [strukturierte Runtime][structured].

**Vorschlag:** Lesende Abfrage und Erzeugung trennen, beispielsweise als ausdrücklich entworfene `at`-/`ensure`-Operationen. Die jetzige automatische Erzeugung ist kompatibilitätsrelevant und darf nicht im Refactoring verschwinden. Mutationen, sparse Arrays und das Einsetzen fremder Container erhalten einen dokumentierten Root-/Notify-Vertrag. DOM-Bindung in einen optionalen Value-Adapter verschieben; Standard-State braucht weder echte noch vorgetäuschte DOM-Knoten. Strukturierte Felder bleiben ein eigenständiges Werkzeug, nicht das Pflichtmodell für jeden Text im Template.

### § 4.10 S04 — Drei Event-Wege mit unterschiedlicher Bedeutung

**Beobachtung:** Reaktive Scopes rufen über `$emit` ihren lokalen `$on`-Callback auf; `EventMixin` nutzt eine übergebene Registry; `ProlitElement.on()`/`@Listen` verwaltet DOM-Listener. Die `MemoryEventRegistry` hält einen Handler je Namen, weshalb geteilte Registries nicht automatisch instanzisoliert sind. Belege: [define][define], [EventMixin][events], [ProlitElement][element].

**Vorschlag:** In Beispielen jeweils nur den zum Zweck passenden Weg zeigen: Template-Event für Eingaben, DOM-Listener für externe Ereignisse, typisierter Callback für eine lokale Ausgabe. Geteilte Registry und Cleanup ausdrücklich als Entscheidung darstellen. Ein allgemeiner Event-Bus soll weder Routing noch Datenbindung unsichtbar verbinden. Async-Callback-Diagnosen und Lebensdauer müssen auch außerhalb des Template-Handlers klar definiert sein.

### § 4.11 P01 — Der ältere HTML-Scope ist kein gleichwertiger Lifecycle-Adapter

**Beobachtung:** `ProlitScopeElement.updated()` erzeugt jedes Mal eine neue Listener-Funktion. `removeEventListener` mit genau dieser neuen Funktion entfernt den zuvor registrierten Listener nicht. Eine passende Listener-Bereinigung in `disconnectedCallback` fehlt. Das Element rendert manuell über `renderInElement`, startet asynchrone Initialisierung und behandelt einige Fehler nur durch Logging bzw. einen leeren Catch. Beleg: [HTML-Scope][html-scope].

**Vorschlag:** Listeneridentität stabil halten, Änderungen an `update-on` diffen, beim Disconnect lösen und beim Reconnect genau einmal verbinden. Asynchrone Initialisierung gegen überholte Kontexte schützen. Vor einer Migration klären, ob dieser Legacy-Adapter auf `prolit(scope)` umgestellt oder ausdrücklich mit eingeschränktem Vertrag weitergeführt wird. Ihm nicht schon heute die automatische Resource-/Action-Aktivierung des neuen Hosts zuschreiben. Diese Korrekturen gehören in einen eigenen Implementierungs-PR, nicht versteckt in dieses Proposal.

### § 4.12 P02 — Späte Eventfehler und Render-Fehlerzustand

**Beobachtung:** `litEnv.handleEvent` erfasst den Scope, ermittelt bei späterer Promise-Rejection jedoch dessen dann aktive Runtime-Bindung. Ein alter Eventauftrag kann nach Reconnect daher die neue Aktivierung diagnostizieren. Die [Directive][directive] zeigt bei Eventfehlern einen technischen Fehler an. Beleg für den asynchronen Pfad: [lit-env][lit-env].

**Vorschlag:** Diagnosen tragen die auslösende Aktivierung/Operation. Späte Fehler bleiben beobachtbar, dürfen aber nicht unbemerkt die neue View in einen alten Fehlerzustand versetzen. Die Directive erhält eine kleine diskriminierte Zustandsform für `active`, `render-failed`, `event-failed` und `connect-failed`, statt mehrere unabhängig interpretierte Flags. Ein fehlender optionaler Scope bleibt Fallback, ein gültiger kaputter Scope bleibt ein technischer Fehler; diese bestehende Unterscheidung erhalten.

## § 5 Gezielte interne Gliederung

| Interner Bereich | Zusammenhängende Verantwortung | Grenze |
|---|---|---|
| Routenregister und Matcher | Normalisierte Definitionen, Konfliktprüfung, vorkompilierte Matcher | Keine Browser-Listener oder View-Erzeugung. |
| Navigation und History-Treiber | Zielentscheidung, Guard-Transaktion, Commit, Back/Forward-Abgleich | Kein Scope oder HTTP. |
| View-Koordination | Effektiver Kontext, Reuse-Entscheidung, Presentation und Disposal | Keine Business-Result-Verarbeitung. |
| Scope-Aktivierung | Bindung, Epoche, Notification, Cleanup und Diagnose | Keine Route oder Lit-Imports. |
| Resource / Action | Jeweilige getrennte Zustandsmaschine und Ownership | Kein globaler App-State. |
| Renderer-Adapter | Prolit-Bindung an einen Lit-Part | Kein zweites Request-System. |
| Compiler und gebundenes Template | Unveränderliches Kompilat getrennt von Instanz-Scope | Kein geteilter veränderlicher Scope im Compile-Cache. |

Das sind Verantwortungsgrenzen, nicht die Anweisung, sofort sieben neue Klassenhierarchien oder Pakete einzuführen. Zuerst passende pure Funktionen und kleine interne Typen verwenden; öffentliche Exports und Pfade möglichst stabil lassen. `withRouter` bleibt ein dünner Anschluss, `ProlitElement` ein kleiner Host. Type-Erasure an dynamischen Plugin-/Compilergrenzen ist nachvollziehbar; sie sollte nicht als `any` durch alle neuen API-Typen fließen.

## § 6 Beobachtbarkeit und Datenhandling

Eine optionale Diagnose soll in Reihenfolge zeigen können: Navigation angefordert → Ziel akzeptiert → View aktualisiert → Scope aktiviert → Read gestartet/überholt → Ergebnis veröffentlicht. Dafür reichen Ereignisname, Navigation-/View-/Operationskennung, Phase, Schlüsselbeschreibung und Dauer. Rohdaten, vollständige Query-Strings, Tokens und `$raw` werden nicht standardmäßig protokolliert; Debug-Ausgabe benötigt eine ausdrücklich konfigurierte Maskierungsfunktion der Anwendung.

Ein praktisches Beispiel für einen Diagnoseeintrag ist `{ phase: 'resource', event: 'cancelled', reason: 'superseded', viewId, operationId }`. Die Anwendung erkennt den Ablauf ohne Zugriff auf interne WeakMaps. Diagnosen dürfen nie selbst die Operation in eine Rejection verwandeln. Die vorhandene Schutzbehandlung fehlerhafter Diagnose-Sinks in [runtime.diagnose][runtime] ist zu bewahren.

Benachrichtigung wird weiterhin in einer Microtask gebündelt. Eine Mutation soll jedoch erkennen lassen, welchen Scope sie betrifft und weshalb sie einen View-Update auslöst. Von außen veränderbare Runtime-Felder, mutierte Route-Snapshots und implizit schreibende Array-Reads machen genau diese Zuordnung schwer. Root-Replacement ist für gewöhnliche UI-Daten der verständliche Standard; tiefe Mutationen mit `$update` bleiben ein bewusst gewählter Escape Hatch.

## § 7 Compiler, Template-Sicherheit und Qualität der Fehlermeldung

[ProLitTemplate][template] verbindet derzeit Template-Quelltext, gebundene Scope-Referenz und eine pro Instanz lazy erzeugte Funktion. Bereits kompilierte Funktionen können bei einer Bindung kopiert werden, doch viele unabhängig erzeugte identische Templates profitieren davon nicht automatisch. Ein getrenntes unveränderliches Kompilat kann mehrfach gebunden werden; ein begrenzter Cache braucht klare Schlüssel, Invalidierung und Größenpolitik. Keine Scope-Instanz darf durch diesen Cache geteilt werden. Benchmarks für viele Komponenten und echte Profilingdaten entscheiden über die Priorität.

[Element2Function][compiler] generiert JavaScript mit `new Function` und `with`; Eventhandler verwenden zusätzlich `eval`. `parseString` erkennt Interpolationen mit einer regulären Expression, die an schließenden Klammern endet, und die Verarbeitung verändert Attribute des AST. Syntaxfehler werden teilweise mit Position `0, 0` erzeugt. [lit-env][lit-env] rekonstruiert Fehlstellen aus Stack-Text und erzeugt `fn.toString()` bei jedem neuen Environment.

Vorgeschlagen sind ein unveränderlicher AST mit Quellspannen, klar getrennte Parsing-/Validierungs-/Codegen-Schritte und Fehler mit Template-Datei, Zeile, Spalte und ursprünglichem Ausdruck. Debug-Code erst bei Bedarf erzeugen. Verschachtelte Objektliterale, Quotes, Template-Literale und Event-Statements benötigen gezielte Syntaxfälle; nicht einen vollständigen JavaScript-Parser durch weitere einzelne Regex-Sonderfälle vortäuschen.

Die aktuelle Sicherheitsgrenze muss deutlich bleiben: Template-Quelltext ist ausführbarer, vertrauenswürdiger Code. `prolit_html` setzt `${...}` in diesen Quelltext ein; untrusted Werte gehören in Scope-Daten. `*catch` kann `String(error)` zurückgeben und ist deshalb kein Ersatz für einen öffentlichen HTTP-Fehlertext. TypeScript prüft nicht automatisch JavaScript in HTML-Strings. Eine Vorabkompilierung, die nur `new Function` beseitigt, ist wegen der Event-Auswertung noch keine CSP-taugliche Lösung. Template-Typprüfung und ein durchgängig ohne dynamische Auswertung auskommender Eventpfad sind getrennte, größere Vorhaben.

Die deklarierten Legacy-Hooks und `$ref` in [ScopeDefinition][scope-define] sollten in einer künftigen Typoberfläche nicht als regulär ausführbare Features erscheinen, solange sie nicht denselben Runtime-Vertrag besitzen. Das ist zuerst ein Dokumentations-/Typabgrenzungsproblem, nicht die Einladung, alle alten Hooks automatisch neu einzuführen.

## § 8 Abnahmematrix für spätere Implementierungen

Die folgenden Fälle sind vorgeschlagene Prüfungen, **keine in diesem PR neu angelegten oder bereits ausgeführten Tests**. Bestehende Tests werden als Ausgangspunkt verwendet, insbesondere [Async-Verträge][async-tests] und [Beispielabläufe][example-tests].

| Fall | Sichtbare / überprüfbare Erwartung |
|---|---|
| Cold Start mit `/users/42?tab=history` | Adresse bleibt erhalten, Ada und history erscheinen, genau ein anfänglicher Read. |
| Scope noch nicht aktiv | Keine I/O-Ausführung trotz bereits gelieferter Route. |
| Rasch 42 → 7, Transport ignoriert Abort | Alter Read endet `cancelled`; nur Benutzer 7 wird veröffentlicht. |
| Tab, Hash oder fremdes Outlet ändern | Kein Read, sofern diese Werte nicht Teil des deklarierten Schlüssels sind. |
| Ungültiger/deaktivierter Schlüssel | Kein Request mit `undefined` oder fremder Primär-ID; nachvollziehbare leere Auswahl. |
| Erster Read fehlschlägt / Wiederholung | Öffentliche Meldung, kein automatischer Loop, Retry für aktuelle Identität. |
| Disconnect / Reconnect | Reads werden abgebrochen; aktuelle Aktivierung lädt einmal; Listener nicht dupliziert. |
| Zwei Scope-/Komponenteninstanzen | Getrennter State; keine gemeinsame Resource/Action-Ownership. |
| Doppelklick auf Speichern | Ein Write; zweiter Aufruf `cancelled/busy`; Originalergebnis bleibt korrekt. |
| Write erfolgreich, danach Refresh fehlgeschlagen | Write bleibt Erfolg; kein automatischer zweiter POST. |
| Eingabe während Save / Reconnect / neue Dialog-ID | Kein Löschen eines neueren Entwurfs; kein UI-Erfolg im falschen Kontext. |
| Guard lehnt Link / programmatische Navigation / Back ab | Definierter URL-/View-Abgleich, Entwurf erhalten, kein veralteter Guard-Commit. |
| Dirty-Dialog schließen wird abgelehnt | Originaldialog bleibt offen; URL und Hintergrund unverändert. |
| Zwei Auxiliary-Views mit unterschiedlichen IDs | Jede erhält eigene Parameter und eigenen Dirty-Owner. |
| Irrelevante Query bei offenem Dialog | Kein erneutes fachliches `onInput` und kein Entwurfsreset. |
| Ein Renderer wirft bei Disposal | Andere Views werden trotzdem bereinigt; Fehler beobachtbar. |
| Snapshot von außen verändert | Bestätigter Router-State bleibt unberührt oder Mutation ist explizit untersagt. |
| Resource im Scope ersetzt | Alte Subscription freigegeben; alter Read kann neue Daten nicht überschreiben. |
| Alter Event-Promise-Fehler nach Reconnect | Diagnose alter Operation; neue View nicht durch alten Fehler ersetzt. |
| Strukturierter Array-Read / Einsetzen fremder Container | Vertrag für Erzeugung, Root, Sparse-Verhalten und Notification nachweisbar. |
| HTML-Scope mehrfach updated/reconnected | Genau ein Listener pro Ereignis; kein später Init-Write nach Entfernung. |
| Fehlerhafte Template-Syntax | Verlässlicher Ausdruck und Quellposition; kein angeblicher Typcheck durch String-Interpolation. |

Zusätzlich sind echte Browserprüfungen für Fokus nach Navigation, Tastatur-/Modifier-Links, Dialog-Escape/Backdrop, Deep-Link-Serverfallback und History außerhalb routereigener Einträge erforderlich. Titel, Fokus und Scroll dürfen nicht versehentlich an HTTP-Abschluss oder jede beliebige Scope-Mutation gekoppelt werden. Ein möglicher Navigation-Policy-Adapter bleibt von Scope getrennt.

## § 9 Umsetzung in überprüfbaren Schritten

Zuerst Source-of-Truth und Tests auf einen Stand bringen: aktuelle gegenüber vorgeschlagenen APIs kennzeichnen, vorhandene Invarianten und Repro-Szenarien festhalten und PR #41 gegen die inzwischen vorhandenen Dialog-Outlets prüfen. Dies ist wichtiger als das vorzeitige Kürzen des bestehenden Verbindungsmerkers.

Danach View-Kontext und Aktivierungsvertrag separat einführen, ohne die öffentliche Darstellung zu wechseln. Erst auf dieser Grundlage `routeResource` ergänzen und die bestehenden Beispiele inhaltlich gleichwertig ersetzen. Ein Review soll sehen können, welche anwendungsseitigen Koordinationszeilen entfallen und welcher interne Vertrag sie ersetzt. Query-Patch und Start-Komfort bleiben kleine unabhängige Ergänzungen.

Cleanup-, Snapshot- und Compileränderungen jeweils nach ihrer Wirkung schneiden, nicht als großes gleichzeitiges Rewrite durchführen. Bestehende Exports über Kompatibilitätsfassaden erhalten, soweit deren Semantik ehrlich beibehalten werden kann. Besonders Navigation-Promises, geänderte Array-Leseoperationen und eine andere View-Reuse-Politik brauchen explizite Migration. `onViewSuccess`, strukturierte Containerbereinigung und AOT gehören nicht als unbeauftragte Begleitänderung in die erste Integration.

## § 10 Review- und Verifikationsstatus

Die Quellbelege sind auf den untersuchten Commit fixiert. Dokumentierte Bestandsbefunde wurden gegen Implementierung und die gelesenen Tests abgeglichen. Die vorgeschlagenen APIs wurden auf vier Ebenen überprüft: Beitrag jeder Beispielzeile, fehlende Voraussetzungen für Anwendungsentwickler, erkennbare Reihenfolge für Reviewer und verlorene Semantik nach Verkürzung. Ein kürzerer Ausschnitt gilt nur dann als Fortschritt, wenn Abbruch, Fehler und Ownership weiterhin verständlich bleiben.

Nicht durchgeführt wurden lokale Builds, Typprüfungen oder Browser-Reproduktionen des gesamten Repositories. Die Diagnose ist deshalb kein Nachweis, dass alle Race-Szenarien in jeder Umgebung bereits auftreten. Konkrete neue Akzeptanzfälle sind vor einer Runtime-Änderung auszuführen. Dieser PR beschränkt sich auf Proposals, Nutzungsbeispiele und einen vorhandenen Retry-Aufruf im aktuellen Router-Beispiel; er fügt keine Tests, Laufzeit-Abstraktionen oder Abhängigkeiten hinzu.

[router]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/router/src/lib/router.ts
[route-tools]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/router/src/lib/route-tools.ts
[with-router]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/router/src/lib/with-router.ts
[outlet]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/router/src/components/router-content.ts
[runtime]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/reactive/runtime.ts
[async]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/reactive/async.ts
[define]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/reactive/define.ts
[structured]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/Scope/scope-runtime.ts
[events]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/Event/EventMixin.ts
[element]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/ProlitElement.ts
[directive]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/prolit.ts
[scope-define]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/scopeDefine.ts
[template]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/ProLitTemplate.ts
[compiler]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/parser/Element2Function.ts
[lit-env]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/lit-env.ts
[html-scope]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/components/prolit-scope/prolit-scope.ts
[dialog-adapter]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/dialog-route-renderer.ts
[dialog-element]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/ProlitDialogElement.ts
[example-api]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/examples/02-api-users.ts
[example-route]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/examples/03-router-users.ts
[async-tests]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/scope-async.spec.ts
[example-tests]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/examples.spec.ts
