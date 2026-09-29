# Router, Prolit und Scope: einfache Anwendungs-API ohne eingeschränkte Erweiterbarkeit

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-29 | dermatthes | §§ 1–12: Ist-Analyse, Ziel-API, Nutzungsperspektiven und Migrationsvorschlag angelegt |

## § 1 Entscheidungsvorschlag und Status

**Vorschlag, nicht implementierte API.** Analysierter Quellstand ist `842245e5996e6d51ff4d1b3ca896a280b2c28506` auf `main`, nach der Zusammenführung von PR #42. „Aktuell“ meint diesen Quellstand, nicht eine behauptete npm-Veröffentlichung. Der offene [Dirty-Navigation-PR #41](https://github.com/trunkjs/trunkjs-monorepo/pull/41) wird separat berücksichtigt; seine APIs gehören nicht zu diesem `main`-Stand. Grundlage dafür ist seine PR-Beschreibung am 29. September 2026, keine vollständige Prüfung seines Diffs.

Die Empfehlung lautet: **bestehende Paketgrenzen erhalten und die fehlende Verbindung zwischen Route und aktivem Scope ergänzen**, statt ein neues Framework über die vorhandenen APIs zu legen. Einfache Seiten brauchen weiterhin nur eine Klasse, eine Route und einen Scope. Routengebundene Daten erhalten einen expliziten Ladeauftrag mit einem sichtbaren Schlüssel. Resources und Actions bleiben die Eigentümer ihrer jeweiligen Zustände.

Die Formulierung „99 Prozent“ ist ein Entwurfsziel für häufige Standardfälle, keine gemessene Abdeckung. Bewertet werden ein direkter Seitenaufruf, Detaildaten, Suche, Speichern und Navigation. Komplexere Anforderungen werden über dieselben Verträge erweitert, nicht durch einen zweiten Anwendungsmodus.

Die [Ist-/Soll-Beispielreihe](../examples/08-router-scope-review.md) zeigt die Nutzung. Das [interne Proposal](2026-09-29-router-prolit-scope-internals.md) dokumentiert Zustandsmodelle, konkrete Codebefunde und Abnahmekriterien. Dieser PR implementiert die neuen APIs nicht und ändert keine Versionsnummern, Laufzeitdateien oder Abhängigkeiten.

## § 2 Was bereits vorhanden ist

| Baustein | Tatsächlicher Vertrag | Konsequenz für Anwendungen |
|---|---|---|
| `@trunkjs/router` | `@route`, Registrierung, URL-Erzeugung, Navigation, History, Outlets und austauschbare `RouteRenderer` | Kein Scope-, HTTP- oder Prolit-Wissen im Router erforderlich. |
| `@trunkjs/scope` | Direkter reaktiver State, Aktivierung, Callback-Ausgabe, Resources und Actions; daneben strukturierte `$value`-Container | State ohne Lit verwendbar; strukturierte Felder sind ein zusätzlicher Anwendungsfall. |
| `@trunkjs/prolit-renderer` | `scopeDefine`, Template-Kompilierung, `prolit(scope)` als Lit-Directive | Die Directive verbindet genau einen aktiven Verbraucher und verantwortet dessen Cleanup. |
| `@trunkjs/prolit` | Optionaler `ProlitElement`, Events, Light-DOM-/Shadow-DOM-Anbindung, Dialoge und struktureller Router-Adapter | Öffentlicher Einstieg für Anwendungskomponenten; kein separates `prolit-elements` mehr im Workspace. |

Belege: [Router][router], [Scope-Runtime][runtime], [direkter Scope][define], [Scope-Adapter][scope-define], [ProlitElement][element] und [Paketübersicht][prolit-readme].

Die heutigen Stärken sollten nicht verloren gehen: Instanzlokaler State, gebündelte Root-Updates, ein aktiver Mount pro Scope, abbrechbare Reads mit „letzter Auftrag gewinnt“, synchron gesperrte Actions, tatsächliche Write-Ergebnisse trotz Disconnect und echte HTML-Links. `@route('/hilfe')` als Kurzform ist **bereits vorhanden**; dafür wird kein weiterer Decorator benötigt.

Die sichtbare Komplexität entsteht vor allem an den Übergängen. [Beispiel 03][example-route] hält `userId`, `#scopeConnected`, `$connect` und `onRouteChange` vor, um einen Benutzer zu laden. Das ist keine beliebige schlechte Schreibweise: Die erste Route kann vor der Aktivierung der Lit-Directive eintreffen. Das bloße Entfernen dieser Koordination würde das Beispiel unzuverlässig machen.

## § 3 Drei Perspektiven auf denselben Ablauf

| Situation | Endnutzer erwartet | Entwickler muss direkt ausdrücken können | Reviewer muss erkennen |
|---|---|---|---|
| Direktlink `/users/42` | Ada erscheint; Adresse bleibt erhalten. | Route und Datenquelle. | Kein erzwungener Start-Redirect. |
| Schnell von 42 nach 7 wechseln | Keine verspätete Anzeige von Ada. | Datenidentität `id`. | Abbruch und Ergebniszuordnung haben einen Eigentümer. |
| Nur einen Tab ändern | Kein Verlust von Daten oder Entwurf. | Welcher Query-Wert UI und welcher Datenquelle dient. | Keine pauschale Neuladung bei jedem Route-Event. |
| Suche leeren oder kein Treffer | Unterscheidbare leere Liste, Lade- und Fehlerzustände. | Abhängigkeit vom Suchbegriff und explizites Retry. | Leer ist Erfolg, nicht Fehler. |
| Speichern | Kein doppelter POST, keine verschwundenen neueren Eingaben. | Mutation und Folgeaktion. | Write-Erfolg ist nicht gleich erfolgreicher Refresh. |
| Zurück, Link oder Dialog schließen | Derselbe Schutz ungespeicherter Daten. | Fachlicher Dirty-Zustand, einmalige Bestätigung. | Kein Navigationsweg umgeht die Prüfung. |
| Zusatzdialog neben Editor | Hintergrund bleibt unverändert. | Eigenes Outlet und dessen Parameter. | Primär- und Dialogdaten werden nicht verwechselt. |
| Fehler | Verständliche Meldung und mögliche Wiederholung. | Öffentlicher Fehlertext. | Technische Ursache wird diagnostiziert, nicht als Serverdetail angezeigt. |

Diese Perspektiven sind Abnahmekriterien, keine zusätzliche Konfigurationsliste für jede Komponente. Die Anwendung soll den fachlichen Unterschied deklarieren; die Bibliothek soll den wiederkehrenden technischen Ablauf ausführen.

## § 4 Standardrouting: vorhandene Einfachheit zuerst nutzen

Eine parameterlose Seite muss weder `withRouter` verwenden noch einen leeren `onRouteChange` implementieren. `ProlitElement` mit `@route('/')` und einem instanzlokalen Scope genügt. Der `@customElement`-Decorator bleibt sichtbar: Er registriert das Web Component, während `@route` nur Metadaten beschreibt. Eine heimliche globale Routenregistrierung beim Import wird nicht vorgeschlagen.

Heute sind die Schritte `new Router([Pages])`, `setDefaultRouter(router)` und `router.start()` getrennt. Als kleine, optionale Ergänzung wird Folgendes vorgeschlagen:

```ts
// VORGESCHLAGEN: dieselben registrierten Komponenten und vorhandenen Outlets.
const router = new Router([HomePage, UserPage]).start({ default: true });
```

`start({ default: true })` bindet ausdrücklich den Default-Router, startet die Browser-Anbindung und liefert die Instanz zurück. Das heutige `start()` ohne Argument behält seine Bedeutung und beansprucht nicht plötzlich den globalen Default. Der Aufruf erzeugt keine DOM-Knoten und navigiert nicht auf eine Startseite, sondern wertet die vorhandene Adresse aus. Ein bereits anderer aktiver Default muss explizit gestoppt werden; keine stille Übernahme.

Für mehrere Router bleiben explizite Instanzen und die vorhandene `resolveRouter()`-Erweiterung erhalten. Ein URL-erzeugender Aufruf bleibt frei von Navigation: Ein `<a href="...">` ist ein Link, kein versteckter Click-Handler. Diese Trennung erleichtert Review, Tastaturbedienung und die vorhandene Behandlung von Modifier-Klicks. Sie ist im [Router][router] bereits angelegt.

## § 5 Routengebundene Daten: ein Auftrag, ein Schlüssel

### § 5.1 Optionale Integration `routeResource`

Vorgeschlagener Export aus `@trunkjs/prolit/router`:

```ts
user: routeResource(this, {
  key: route => route.params['id'],
  load: async (_context, id) => {
    const user = sampleUsers[id];
    if (!user) throw new Error(`Unknown user ${id}`);
    return user;
  },
  errorMessage: 'User could not be loaded.',
}),
```

`sampleUsers` ist die ausdrücklich definierte lokale Datenquelle aus Beispiel 03, keine erfundene Bibliotheksfunktion. Eine echte HTTP-Variante ruft den typisierten API-Stub direkt in `load` auf und reicht `context.signal` weiter. Die vollständige Komponentenvariante steht in der Beispielreihe.

`routeResource(host, options)` liefert `data`, `pending`, `error` und `reload(): Promise<ScopeResult<T>>`. Der Schlüssel wird aus dem **effektiven Kontext der betreffenden View** gelesen. `load(context, key)` erhält ihn als zweites Argument; ein Tupel wird als Tupel übergeben, nicht implizit in mehrere Argumente aufgeteilt. `reload()` wiederholt den Auftrag mit dem aktuellen Schlüssel. Der vorhandene manuelle `scopeResource` behält dagegen `reload(...args)`.

### § 5.2 Verbindliches Verhalten des vorgeschlagenen Adapters

| Ereignis | Vorgeschlagene Wirkung |
|---|---|
| Konstruktion oder erstmaliges Route-Event vor Scope-Aktivierung | Nur Konfiguration bzw. aktueller Schlüssel; noch kein Request. |
| Scope wird mit gültigem Schlüssel aktiviert | Genau ein Read für die aktuelle Aktivierung. |
| Schlüssel verändert sich | Vorherigen Read abbrechen, vorherige Auswahl entfernen, neue Daten laden. |
| Andere Query-Werte, Hash oder anderes Outlet verändern sich | Keine neue Datenanfrage; betroffene UI-Ausdrücke dürfen trotzdem aktualisiert werden. |
| Schlüssel ist `null` | Read deaktivieren, ausstehenden Read abbrechen und Auswahldaten entfernen. Kein Request mit Ersatz-ID. |
| Gleicher Schlüssel nach Fehler | Kein automatischer Retry-Loop; Wiederholung durch `reload()`. |
| Disconnect / Reconnect | Read abbrechen / einmal für den dann aktuellen Schlüssel laden. |
| Ressource ersetzt oder entfernt | Subscription und Read der alten Ressource freigeben. |

Als Schlüssel dienen Strings, Zahlen, Booleans oder flache readonly Tupel daraus; Vergleich per `Object.is` je Bestandteil. Keine Objektserialisierung und kein implizites Deep-Watching. Für Auswahlwechsel ist das sichere Standardverhalten `retainData: false`. Eine ausdrücklich aktivierte Datenbeibehaltung muss der Anwendung die zu den angezeigten Daten gehörende Identität bereitstellen; sonst wäre eine alte Anzeige unter einer neuen URL irreführend. Diese Variante gehört nicht in den ersten Minimalumfang.

`key: r => [r.params['tenant'], r.query.get('q') ?? ''] as const` erklärt eine komplexere Abhängigkeit lokal. Der Reviewer sieht unmittelbar, weshalb ein Request wiederholt wird. Ein Tab, der nur die Darstellung ändert, gehört nicht in diesen Schlüssel.

### § 5.3 Keine versteckte zweite Laufzeit

Der Adapter muss auf der bestehenden Resource und Scope-Aktivierung aufbauen, nicht einen zweiten Cache, Scheduler oder `$connect`-Aufruf einführen. Ein Lit-Controller kann Host-Verbindungen verwalten; `hostConnected` ist aber nicht gleichbedeutend mit der Aktivierung der Prolit-Directive. Deshalb braucht die Integration zusätzlich einen kontrollierten Aktivierungsvertrag aus Scope. Die [Lit-Controller-Dokumentation](https://lit.dev/docs/api/controllers/) beschreibt nur den Host-Lebenszyklus.

Die notwendige Verbindung ist eine Bibliotheksänderung, keine im Beispiel nachzubauende Hilfsklasse. Ein vollständiger Entwurf muss auch Paketabhängigkeiten und Deklarationsausgabe lösen: Bevorzugt verwendet der optionale Adapter einen strukturellen Host-/View-Vertrag. Falls er Router-Laufzeitcode importiert, ist eine ausdrückliche optionale Peer-Abhängigkeit zu prüfen. Scope und Router dürfen niemals dafür Prolit importieren. Der Hauptimport von Prolit soll routerfrei bleiben.

Manuelles `scopeResource.reload(...)`, `prolit(scope)` in bestehenden Lit-Hosts und direkte Scope-Nutzung ohne Renderer bleiben unverändert verfügbar. Anwendungen werden nicht auf routengebundene Daten gezwungen.

## § 6 URL-State nachvollziehbar verändern

Heute erzeugt `router.url({ name, params, query })` vollständige Ziele mit ausdrücklich übergebenen Parametern. Das ist transparent und soll erhalten bleiben. Komfort darf nicht dadurch entstehen, dass fehlende Mandanten- oder Objekt-IDs unsichtbar von einer früheren Route geerbt werden.

Ergänzend wird `router.updateQuery(patch, options?)` vorgeschlagen: Ein Suchfeld oder Tab ändert die Query der aktuellen Adresse, ohne Pfad, Outlets, Hash und nicht genannte Query-Werte neu zusammensetzen zu müssen. Für häufige Eingaben ist die History-Entscheidung sichtbar:

```ts
// VORGESCHLAGEN: ersetzt nur den Suchwert der aktuellen Adresse.
await router.updateQuery({ q: searchText || null }, { replace: true });
```

Nicht genannte Schlüssel bleiben einschließlich mehrfacher Werte erhalten; `undefined` lässt einen Schlüssel unverändert, `null` entfernt ihn, ein skalarer Wert ersetzt seine bisherigen Vorkommen. Ohne aktive Route ist der Aufruf ein Konfigurationsfehler. Die Änderung durchläuft dieselbe Navigation und dieselben Guards wie ein Link. Bei Ablehnung bleibt die bestätigte Query maßgeblich; das Eingabefeld muss auf diesen Wert zurückgesetzt werden. Debouncing ist eine zusätzliche, explizite UX-Entscheidung und nicht Voraussetzung für die API.

Der direkte Aufruf `router.current.query.set(...)` darf dagegen keine empfohlene Nutzung sein: Die aktuellen `readonly`-Typen verhindern nicht das Mutieren von `URLSearchParams`, und dadurch würden History und Benachrichtigung umgangen. Das interne Proposal beschreibt die Snapshot-Grenze.

Typisierte Routen-Handles können später String-Namen und Parameterfehler weiter reduzieren. Dafür ist ein eigenständiger Typentwurf nötig: Ein Class-Decorator erzeugt nicht automatisch neue, statisch bekannte Klassenmitglieder. Keine erfundenen `UserPage.route(...)`-Methoden in aktuellen Beispielen und kein verpflichtender Codegenerator für einen einfachen Link.

## § 7 Schreiben, Formularzustand und Erfolg nicht vermischen

Die bestehenden `scopeAction`-Ergebnisse sind nützlich und bleiben erhalten. Ein Check auf `result.status === 'success'` ist fachliche Logik, keine überflüssige Boilerplate. Ein erfolgreicher POST mit anschließend gescheitertem Listen-Refresh darf nicht als fehlgeschlagener POST erscheinen. Andernfalls könnte „Retry“ einen bereits ausgeführten Write wiederholen. Die heutige [Action-Implementierung][async] trennt diese Operationen sinnvoll.

[Beispiel 02][example-api] zeigt jedoch eine Review-Falle: Während eines POST bleibt das Eingabefeld editierbar; nach Erfolg wird `draft` geleert. Neuere Eingaben können so verschwinden. `this.isConnected` schützt außerdem nicht vor einem inzwischen anderen Kontext derselben wiederverwendeten Instanz. Der Standardfall sollte die Eingabe während dieses Writes sperren oder den abgeschickten Entwurfsstand mit dem aktuellen vergleichen. Wiederverwendete Views benötigen zusätzlich eine Aktivierungs-/Identitätsprüfung.

Eine optionale spätere Vereinfachung ist `scopeAction({ run, errorMessage, onViewSuccess, viewKey? })`. `onViewSuccess(data, ...args)` führt nur synchrone lokale Folgearbeit aus, wenn der Write erfolgreich war und dieselbe Scope-Aktivierung sowie derselbe optionale fachliche `viewKey` noch gültig sind. Ein Beispiel ist Entwurf leeren und einen **separaten** Refresh anstoßen. Es ist kein serverseitiger Erfolgs-Hook: Das tatsächliche `ScopeResult` bleibt auch nach Disconnect erhalten, selbst wenn die UI-Folgearbeit entfällt.

Diese Ergänzung ist bewusst nachrangig. Fehler in `onViewSuccess` dürfen den bereits erfolgreichen Write weder umklassifizieren noch wiederholen; sie benötigen eine separate Effekt-Diagnose. Eine versehentlich zurückgegebene Promise muss kontrolliert behandelt werden. Für asynchrone Geschäftsabläufe bleibt `await action(...)` mit expliziter Ergebnisentscheidung der bessere Weg. Das Ergebnisobjekt wird nicht durch eine zweite, konkurrierende Status-API ersetzt. Beispiel 08 stellt beide Wege gegenüber.

Für umfangreichere Formulare bleiben strukturiertes `createScope`, eigene Validatoren und explizite DTOs möglich. Ein Scope ist weder automatisch ein persistierbares Serverobjekt noch ein globaler Store. Insbesondere ist `$rawPure` nur ein flach gefilterter Blick auf Felder, kein tief kopierter, validierter Request-Body.

## § 8 Navigationsergebnis und Dirty-Schutz gemeinsam entwickeln

Heute liefern `navigate` und `replace` synchron `RouteContext | null`. PR #41 beschreibt eine Umstellung auf `Promise<RouteContext | null>`. Das ist eine öffentliche Vertragsänderung und darf nicht als rein additive Bequemlichkeit behandelt werden. Für eine zukünftige gemeinsame Version wird ein eindeutiges Ergebnis vorgeschlagen:

```ts
type NavigationResult =
  | { status: 'committed'; route: RouteContext }
  | { status: 'cancelled'; reason: 'guard' | 'superseded' }
  | { status: 'unmatched'; url: string }
  | { status: 'reloading'; url: string };
```

`committed` bedeutet bestätigte Router-Navigation, nicht fertige HTTP-Daten, abgeschlossene Animation oder vollständig aktualisierte Kindkomponenten. Ein Reload-Ergebnis beschreibt die veranlasste Browser-Navigation, nicht deren späteren Erfolg. Fehlerhafte benannte Ziele und fehlende Pflichtparameter bleiben Programmierfehler; bei Promise-basierten Navigationsmethoden werden sie als Rejection behandelt. `url()` und `match()` bleiben synchron. Bestehende synchrone Aufrufer brauchen daher eine ausdrücklich geplante Migration.

Alle Navigationseinstiege müssen denselben Ablauf nutzen: prüfen, gegebenenfalls bestätigen, auf Überholung prüfen, committen, Views aktualisieren. PR #41s Navigationsergebnisse sind nicht bereits das hier vorgeschlagene `NavigationResult`. Die Rückgabeänderung muss unter anderem den heutigen synchronen Ausdruck `!this.router.replace(...)` im [Dialog-Outlet][outlet] ersetzen. Eine Promise ist unabhängig vom späteren Ergebnis wahrheitswertig.

Dirty-Zustand gehört zu bearbeiteten View-Instanzen, nicht pauschal zur letzten URL. Eine mögliche Erweiterung zu PR #41 ist `setDirty(value, { owner })`; ohne Owner bleibt ein einfacher, primärseitiger Komfortfall möglich. Das Entfernen eines anderen Outlets oder eine harmlose Tab-Änderung darf nicht sämtliche Entwürfe als sauber markieren. Explizite Dirty-Checks bleiben für aggregierte und bedingte Fälle erhalten. Die genaue Syntax ist vor der Implementierung mit PR #41 abzugleichen.

Bei Back/Forward ist der Browser-Verlauf eine eigene Grenze: Die Zieladresse kann vor Abschluss einer asynchronen Bestätigung sichtbar sein. Eigene History-Einträge brauchen eine nachvollziehbare Positions-/Transaktionskennung; fremde Einträge lassen sich nicht beliebig wie eigener Zustand zurückrollen. Die dortigen Garantien müssen dokumentiert und browserseitig geprüft werden. Weder Scope noch ein Dialog-Adapter darf eigenmächtig History reparieren. Das Schließen eines Tabs bzw. Dokument-Neuladen erfordert einen gesonderten `beforeunload`-Vertrag; SPA-Guards allein decken es nicht ab.

## § 9 Dialoge und Outlets: gleiche Semantik, unterschiedliche Darstellung

Die vorhandene Form `ExampleUserDialog.show(input)` mit `DialogResult` ist bereits verständlich. Ebenso sind `@route({ presentation: 'dialog', ... })`, `createDialogRouteRenderer()` und ein benanntes Outlet geeignete Erweiterungspunkte. Hier ist keine neue Dialog-DSL nötig. Der heutige [Adapter][dialog-adapter] verbindet die beiden Pakete strukturell, ohne den Router von Prolit abhängig zu machen.

Zwei Verträge benötigen aber Präzisierung. Erstens muss jede View ihre **eigenen** Parameter erhalten. Präsentierte Auxiliary-Views bekommen diese schon über `RouteRenderContext.params`; ein inline gemountetes `withRouter`-Element liest heute dagegen grundsätzlich `router.current.params`, also die Primärroute. Der künftige effektive View-Kontext darf diesen Unterschied nicht auf die Anwendung abwälzen.

Zweitens muss eine abgelehnte Schließ-Navigation den Dialog und den Entwurf erhalten. Aktuell wartet der Adapter auf das Ergebnis von `open()` und ruft erst danach `context.close()` auf; zu diesem Zeitpunkt ist die Präsentation bereits geschlossen. Ein asynchroner Guard braucht deshalb einen **Vorab-Schließvertrag**, nicht nur ein `await` hinter der bestehenden Reihenfolge. Erst Freigabe/Commit, dann Disposal; Navigations-Disposal darf keine weitere Navigation auslösen.

Input-Aktualisierung muss fachliche Identität und Darstellung unterscheiden. Der Adapter vergleicht heute Parameter und die gesamte Query per Serialisierung. Eine irrelevante Query-Änderung kann damit `onInput` auslösen und einen von dort neu initialisierten Entwurf überschreiben. Ein expliziter Input-Schlüssel bzw. ein Input-Mapping muss festlegen, welche Änderungen tatsächlich neue Daten bedeuten. Die bestehenden Inline- und Presentation-Reuse-Regeln bleiben während der Migration zunächst erhalten; eine Angleichung benötigt eine bewusst gewählte `reuse`-Politik mit Dirty-Prüfung.

## § 10 Erweiterbarkeit ohne Sonderwelt

| Erweiterter Fall | Erhaltener oder vorgeschlagener Anschluss |
|---|---|
| Freie programmatische Registrierung | `addRoute`, `register` und explizite Definitionen bleiben neben Decorators verfügbar. |
| Mehrere Instanzen desselben Elements | Je Instanz Scope, Resource und Action; keine global geteilte Definition als Abkürzung. |
| Mehrere Router | Explizites `resolveRouter`, kein erzwungener Singleton. |
| Unabhängiger Inspector/Dialog | Auxiliary-Outlet mit eigenem View-Kontext und eigenem Dirty-Owner. |
| Individuelle Ladebedingungen | Manuelle `scopeResource.reload`, explizite Schlüssel-Tupel oder deaktivierender `null`-Schlüssel. |
| Eigene Darstellung / Nextrap | Bestehender `RouteRenderer`-/`DialogRenderer`-Vertrag, Integration außerhalb des Kerns. |
| Bestehender Lit-Host oder zwei Roots | Direkte `prolit(scope)`-Einbindung bzw. optionales `withProlitLightDom`. |
| Strukturierte Formdaten | Bewusst gewähltes `$value`-/`$meta`-Modell mit gemeinsamem Benachrichtigungsvertrag. |
| Nicht-UI-Verbraucher | Scope-Runtime ohne Router/Lit; nicht künstlich einen DOM-Host erzeugen. |
| Große Anwendungen | Spätere Lazy-Registrierung, verschachtelte Layouts oder Guards bauen auf normalisierten Routen und Navigationstransaktionen auf; im aktuellen Router nicht als bereits vorhanden behaupten. |

Server-Rendering, Route-Level-Data-Loader, globale Caches und tiefes automatisches State-Tracking sind keine stillen Folgen dieses Vorschlags. Eine optionale Compiler-/Typprüfungsstrecke wird getrennt bewertet. Das Ziel ist weniger anwendungsseitige Koordination, nicht möglichst viele neue API-Namen.

## § 11 Prioritäten, Alternativen und Migration

| Stufe | Inhalt | Warum diese Reihenfolge? |
|---|---|---|
| P0 — Verträge absichern | Effektiver View-Kontext, nachvollziehbarer Read-/Write-/View-Lebenszyklus, Dialog-Schließreihenfolge und Abgleich mit PR #41 | Komfort darf keine Datenverluste oder widersprüchliche Navigation verdecken. |
| P1 — Häufige Fälle vereinfachen | `routeResource`, optionales `start({ default: true })`, Query-Patch über normale Navigation | Entfernt konkrete wiederkehrende Koordination in bestehenden Beispielen. |
| P2 — gezielte weitere Ergonomie | `onViewSuccess` erst nach Lebenszyklusvertrag; typisierte Routen-Handles, bessere Diagnosen und Snapshot-API | Nutzen mit mehr Vertrag/Typen abwägen; nicht Voraussetzung für den Einstieg. |
| P3 — gesondertes Compilerprojekt | Ausdrückliche Vorabkompilierung, Template-Typprüfung und CSP-taugliche Event-Kompilierung | Größerer Aufwand und andere Abnahmekriterien als Routing-Komfort. |

Nicht empfohlen werden ein verpflichtender `ProlitRouteElement`, ein Mega-Decorator für Route/HTTP/Formular/Events, blindes Beobachten des gesamten Scopes und automatische Write-Retries. Sie sparen lokal Zeichen, verlagern aber wichtige Entscheidungen in versteckte Mechanismen. Ebenfalls nicht sinnvoll ist das bloße Umbenennen von `scopeDefine`: Der aktuelle Schmerz liegt im Lifecycle-Übergang, nicht in dessen Schreibweise.

Die Einführung erfolgt separat von diesem Proposal-PR. Zuerst aktuelle Verträge mit Regressionen absichern, dann die optionale Integration hinzufügen und die gleichen Beispielabläufe dagegen prüfen. Die Promise-/Ergebnisumstellung der Navigation muss koordiniert erfolgen; eine synchrone Kompatibilitätsfassade darf asynchrone Guard-Garantien nicht nur vortäuschen. Release-/Major-/Prerelease-Entscheidungen sind ausdrücklich zu treffen. Die noch nicht finale Paketaufteilung ist keine Zusicherung, dass niemand vorhandene APIs verwendet.

Die aktuellen TypeScript-Beispiele bleiben bei implementierten Aufrufen. Zukünftige Varianten stehen nur in eindeutig markierten Markdown-Abschnitten. Erst nach Umsetzung, Typprüfung und Laufzeittests werden sie zu ausführbaren Standardbeispielen. Historische Proposals dürfen dabei nicht als aktuelle Nutzungsdokumentation erscheinen.

## § 12 Review-Fragen und Nachweise

Ein Reviewer sollte für jede Seite ohne Kenntnis der Interna diese Fragen beantworten können: Welche Route und welche Datenidentität gelten? Was löst I/O aus? Wer besitzt den Entwurf? Was geschieht bei Abbruch, Überholung, Fehler und Reconnect? Welche Folgeaktion setzt einen bestätigten Write voraus? Ein kompakter Codeausschnitt, der diese Fragen verschweigt, gilt nicht als Verbesserung.

Die Analyse beruht auf Quellcode, Paketdokumentation, bestehenden Beispielen und ausgewählten Tests, insbesondere [Resource-/Action-Verträgen][async-tests] und [Beispieltests][example-tests]. Es wurden in dieser Umgebung keine lokalen Repository-Tests und keine Browserabläufe ausgeführt. Die aufgeführten Race-Szenarien und Architekturänderungen sind daher gezielt zu reproduzierende Prüfaufträge, keine behaupteten vollständigen Laufzeit- oder Sicherheitsnachweise. Der PR trennt überprüfbare Codebeobachtungen, abgeleitete Risiken und neue API-Entwürfe.

[router]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/router/src/lib/router.ts
[runtime]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/reactive/runtime.ts
[define]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/reactive/define.ts
[scope-define]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/scopeDefine.ts
[element]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/ProlitElement.ts
[prolit-readme]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/README.md
[example-route]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/examples/03-router-users.ts
[example-api]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/examples/02-api-users.ts
[async]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/scope/src/reactive/async.ts
[outlet]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/router/src/components/router-content.ts
[dialog-adapter]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/dialog-route-renderer.ts
[async-tests]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit-renderer/src/lib/scope-async.spec.ts
[example-tests]: https://github.com/trunkjs/trunkjs-monorepo/blob/842245e5996e6d51ff4d1b3ca896a280b2c28506/packages/prolit/src/lib/examples.spec.ts
