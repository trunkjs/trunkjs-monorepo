# Prolit SPA-Beispiele: ein Muster, verschiedene Aufgaben

**Entwürfe, keine lauffähigen Demos.** `ProlitElement`, `scopeResource`, `scopeAction`, `$connect` und `$event` sind vorgeschlagen. Der [Frontentwurf §§ 3–6](../2026-09-12-prolit-elements-frontentwurf.md) definiert die Semantik; die TypeScript-Dateien zeigen Scope und Template direkt zusammen. Serviceaufrufe sind nur Signaturen. Die Fälle sind eine Auswahl typischer SPA-Aufgaben, kein Vollständigkeitsversprechen für jede Anwendung.

## Einstieg in 30 Sekunden

```ts
// Datenquelle + öffentliche Fehlermeldung
users: scopeResource({
  load: ({ signal }) => userApi.list({ signal }),
  errorMessage: 'Benutzer konnten nicht geladen werden.',
}),
// Auslöser: eine normale Funktion, kein automatischer Request beim Rendern
$fn: { reload: (): void => { void this.scope.users.reload(); } },
$hooks: { $connect: () => { void this.scope.$fn.reload(); } },
// Template liest users.data / users.pending / users.error.
```

Alle Snippets hier sind Ausschnitte für den jeweils beschriebenen Scope, keine zusätzlichen Exporte. Pro Datei zuerst fragen: **Welche Daten? Welche Aktion? Was löst sie aus? Wo erscheint der Fehler?** Wenn dafür mehrere Dateien mit interner Verdrahtung geöffnet werden müssten, ist der Entwurf noch nicht einfach genug.

## Szenarien und überprüfbare Erwartungen

| Aufgabe / Beispiel | Bibliotheksentwickler: Kernverantwortung | Anwendungsentwickler: sichtbarer Ablauf | Verhalten für den Nutzer / Grenze |
|---|---|---|---|
| [Minimal laden](user-table-resource.ts) | Pending/Error und Host-Updates zuverlässig melden | `$connect → $fn.reload → users` | Ladeanzeige, leere Liste und Fehler sind verschiedene Zustände; Retry per Button |
| [Tabelle und Dialog](user-table.ts) | doppelte Action-Aufrufe unterdrücken | `edit → show → submitted? → reload` | kein zweiter Dialog; Abbrechen lädt nichts neu; Refresh-Fehler behauptet keinen Save-Fehler |
| [Formular speichern](user-edit-dialog.ts) | Read und Action getrennt verwalten | `open → load → draft → save → submit` | Eingaben bleiben bei Save-Fehler erhalten; fehlender User erzeugt kein editierbares Leerformular |
| [Schnelle Suche](user-search.ts) | alte Reads invalidieren, nicht nur Abort anfordern | Eingabe wird synchron gelesen, `reload(query)` nennt Parameter | B bleibt sichtbar, selbst wenn Antwort A später kommt; keine alten Treffer unter neuer Suche |
| [Wechselnde Details](user-details.ts) | neue Parameter ohne Scope-Sharing verarbeiten | Parent ruft `select(id)` auf | Auswahl A→B zeigt nie A unter B; vor Connect wird nur die Auswahl gespeichert |
| [Live-Daten](live-users.ts) | Cleanup genau einmal ausführen | Subscribe und Rückgabe von `stop` stehen zusammen | nach Entfernen keine Updates; Reconnect genau eine Subscription; Fehler markiert alte Zahl |
| Zwei Instanzen | keine Module-Singletons / versteckte gemeinsame Cachewerte | zweimal ein Element erstellen | Änderungen am ersten Formular verändern das zweite nicht |
| Navigation während Read | `cancelled/disconnected`, keine späte Datenübernahme | vorhandener Disconnect-Vertrag | keine Fehleranzeige für absichtlich verlassene Ansicht |
| Navigation während Write | kein falsches Rollback-/Abort-Versprechen | nach `await` vor DOM-Aktion `isConnected` prüfen | Server kann bereits gespeichert haben; ein Navigationsschutz ist eine App-Entscheidung |

Die Tabelle nennt Akzeptanzkriterien für die spätere Implementierung; diese Laufzeitfälle sind noch nicht durch den API-Entwurf getestet.

## 1. Reads: Erfolg, Fehler und Abbruch nicht verwechseln

Ungünstig: Der Anschluss behandelt jedes aufgelöste Promise als Erfolg.

```ts
await scope.user.reload('42');
scope.draft = { ...scope.user.data }; // Fehler oder überholter Read könnten vorliegen.
```

Klarer: Der Übergang zum nächsten fachlichen Zustand hängt am expliziten Ergebnis.

```ts
const result = await scope.user.reload('42');
if (result.status === 'success') {
  scope.draft = { name: result.data.name, email: result.data.email };
}
// error: user.error besitzt Meldung und Ursache. cancelled: keine Fehlermeldung.
```

**Kernsicht:** Die Ressource muss auch den Promise-Wert eines überholten Aufrufs als `cancelled` auflösen. **Anwendungssicht:** Die Bedingung zeigt sofort, wann ein Draft entsteht. **Nutzersicht:** Ein später Read kann neue Eingaben nicht unerwartet überschreiben.

## 2. Requests gehören an einen sichtbaren Auslöser

Ungünstig: `*do="fetch(...)"` oder ein Request in `renderDialog()`. Jedes Rendern kann eine neue Anfrage auslösen; Statusänderungen erzeugen dann weitere Renderings. Ebenfalls irreführend: `scope.query = 'Ada'` stillschweigend als Request-Trigger voraussetzen.

Klarer: `$fn.search('Ada')` setzt `query` und ruft sichtbar `users.reload('Ada')` auf, wie in [user-search.ts](user-search.ts). Der erste Request startet erst bei Eingabe; es gibt dort bewusst keinen Connect-Fetch.

**Kernsicht:** Der Compiler braucht kein Dependency-Tracking für beliebige JS-Ausdrücke. **Anwendungssicht:** Eine explizite Aktion ist gut auffindbar. **Grenze:** Das Minimalbeispiel startet einen Read pro Eingabe. „Neueste Antwort gewinnt“ ist kein Debounce und begrenzt nicht die Serverlast. Für Live-Suche mit hoher Last wäre eine sichtbare Verzögerung am Auslöser ein eigener Schritt; für teure Suchen kann ein normaler Submit-Button passender sein.

## 3. Parent, Route und Child: Eingaben über eine Aktion

```ts
import { UserDetails } from './user-details';

const details = new UserDetails();
details.scope.$fn.select('42'); // disconnected: records selection, starts no request
container.append(details);     // $connect loads the recorded ID
// Later, for example after a route or master-row selection:
details.scope.$fn.select('84');
```

Ungünstig: `details.scope.selectedId = '84'` schreiben und erwarten, dass beliebige Datenänderungen automatisch Requests starten. Ebenfalls ungünstig: Child greift auf `parent.scope` zu. Das macht die Komponente von der konkreten Einbettung abhängig.

**Kernsicht:** Scope-Zustände bleiben instanzlokal. **Anwendungssicht:** `select(id)` ist der öffentliche Eingabeweg; die ID und ihre Wirkung sind zusammen sichtbar. **Grenze:** HTML-Attribute, URL-History und komplexes Routing sind hier keine Prolit-Funktion. Ein Router übersetzt seine Route in denselben Aufruf. Ein Komponentenergebnis kann als typisiertes Promise wie beim Dialog oder explizites CustomEvent zurückgegeben werden; es entsteht kein globaler Eventbus.

## 4. Formulare: die Datensicherung gehört zum Save

Ungünstig: ein gemeinsames `error`, ein Retry-Button für Laden und Speichern und ein Draft, der direkt dasselbe User-Objekt wie die Tabelle referenziert. Abbrechen kann dann bereits Daten verändert haben; Neu-Laden nach Save-Fehler kann Eingaben vernichten.

Klarer: [user-edit-dialog.ts](user-edit-dialog.ts) hält `draft`, `user.error` und `$fn.save.error` getrennt. Der Draft ist ein eigenes Objekt. Ein Save-Fehler bietet erneutes Speichern im bestehenden Formular; ein Load-Fehler bietet erneutes Laden. Erst das erfolgreiche Serverergebnis geht an `submit`.

**Kernsicht:** `scopeAction` setzt `pending` synchron und lässt pro Aktion nur einen laufenden Aufruf zu. **Anwendungssicht:** Keine manuell synchronisierten Flags `saving`, `loaded`, `loading`; `closing` bleibt ein eigener, klar benannter Dialogzustand. **Nutzersicht:** Eingaben und Fehlermeldung bleiben sichtbar; Controls sind während Save gesperrt.

**Grenzen:** `type="email"` und `required` sind Browservalidierung, keine Servervalidierung. Direkte TypeScript-Aufrufe umgehen den Browser-Submit. Komplexe Feldfehler, Dirty-Tracking, Datei-Uploads, Mehrschrittformulare und Konflikte paralleler Bearbeitungen benötigen zusätzliche Fachverträge. Ein Save wird nach Timeout nicht automatisch wiederholt: Ohne serverseitige Idempotenz könnte der erste Versuch bereits erfolgreich gewesen sein.

## 5. Lokal filtern, Summen und Zustand ändern

Für lokale Daten braucht es weder Ressource noch asynchronen Action-Wrapper. Beispielausschnitt:

```ts
items: [{ id: 'a', amount: 10 }],
$fn: {
  total: (): number => this.scope.items.reduce((sum, item) => sum + item.amount, 0),
  add: (): void => {
    this.scope.items = [...this.scope.items, { id: crypto.randomUUID(), amount: 5 }];
  },
},
// Template: {{ $fn.total() }} and @click="$fn.add()"
```

Ungünstig: `items.push(...)` und automatische tiefe Reaktivität erwarten; oder eine `scopeAction` für jede einfache Addition anlegen. **Kernsicht:** Ein konsistenter flacher Update-Vertrag genügt zunächst. **Anwendungssicht:** Ein reiner abgeleiteter Wert ist erkennbar; ein neuer Array-Wert löst das Update aus. **Grenze:** Aufwendiges Sortieren großer Datenmengen bei jedem Render braucht Messung und gegebenenfalls Memoisierung/Virtualisierung; der Scope löst das nicht automatisch.

## 6. Pagination und Sortierung sind derselbe parametrisierte Read

Ein Anwendungsservice kann einen vollständigen Query-Wert annehmen:

```ts
// App-owned signature, deliberately no transport implementation.
declare function loadPage(query: { page: number; sort: string }, options: { signal: AbortSignal }): Promise<User[]>;

// Resource declaration:
users: scopeResource({
  load: ({ signal }, query: { page: number; sort: string }) => loadPage(query, { signal }),
  retainData: false,
  errorMessage: 'Seite konnte nicht geladen werden.',
}),
// Action body: query is an application-owned scope field.
// scope.query = { page: 1, sort: 'name' }; // sort changes reset page explicitly
// await scope.users.reload(scope.query);
```

**Kernsicht:** Kein weiterer Helper neben parametrisierter Ressource. **Anwendungssicht:** Seite und Sortierung werden als ein Request-Snapshot übergeben. **Grenze:** Cursor, Gesamtzahl, URL-Synchronisation und Berechtigungen gehören zum jeweiligen API-Vertrag. Parameterobjekte nicht während einer laufenden Anfrage mutieren; stattdessen einen neuen Wert übergeben.

## 7. Live-Daten passen nicht in jedes Promise-Modell

[LiveUsers](live-users.ts) zeigt einen absichtlichen Sonderfall: Eine Subscription liefert viele Werte und eine Stop-Funktion. `$connect` registriert sie und gibt die Bereinigung zurück. Das lokale `active` verhindert auch bereits eingeplante späte Callbacks nach Disconnect.

Ungünstig: eine Subscription in `render()` starten oder `scopeResource` so lange erweitern, bis sie zusätzlich Streaming, Reconnect und Transportzustand modelliert. **Kernsicht:** Prolit garantiert nur den Cleanup-Lifecycle. **Anwendungssicht:** Start und Stop sind im gleichen Block. **Grenze:** Transport und Wiederverbindung bleiben beim Service; das Beispiel zeigt nach Stream-Fehler eine veraltete Zahl und verspricht keinen automatischen Retry. `subscribeCount` muss bei synchron fehlgeschlagenem Setup selbst schon erworbene Transportressourcen freigeben; der Hook kann keine noch nicht zurückgegebene Cleanup-Funktion aufrufen.

## 8. Technische Fehler, Berechtigungen und nicht gelöste Aufgaben

- **Template-Tippfehler:** `{{ usres.data }}` bleibt ohne Template-Typcheck ein Laufzeitfehler. Der geplante Fallback meldet das Problem kontrolliert; Diagnose enthält den Ausdruck. Ein generischer Scope allein macht HTML-Strings nicht typsicher.
- **Berechtigungen:** `*if="canEdit"` steuert Anzeige. Die Server-API muss Änderungen unabhängig davon autorisieren; Prolit ist keine Zugriffskontrolle.
- **Offline und Optimistic UI:** Lokale Anzeige eines vermeintlich erfolgreichen Saves benötigt Rücknahme, Versionierung und Konfliktregeln. Diese Beispiele warten auf Erfolg; keine versteckte Offline-Queue.
- **Gemeinsamer Cache:** Zwei Instanzen laden unabhängig. Deduplizierung über Instanzen hinweg braucht eine ausdrücklich gemeinsame Service-/Cache-Grenze, keine globale Scope-Variable.
- **Strenge CSP / SSR:** Der aktuelle Runtime-Compiler ist browserabhängig und verwendet dynamische Codeauswertung. Ein zusätzlicher Betriebsmodus ist nötig; ein hübscheres Scope-API löst das nicht.
- **Lange Dialoge / Uploads:** Die gezeigte einfache Dismiss-Sperre ist für kurze Saves gedacht. Fortschritt, Abbruch und Navigation benötigen bei langen Operationen eine eigene UX und serverseitige Semantik.

## Entscheidung aus beiden Perspektiven

Der Bibliotheksentwickler bekommt einen kleinen, prüfbaren Vertrag statt immer neuer Features. Der Anwendungsentwickler bekommt wiedererkennbare Namen, explizite Auslöser, lokale Fehlermeldungen und direkte öffentliche Callback-Zugriffe. Die Anwendung bleibt dann leicht zu lesen, wenn ihre fachlichen Entscheidungen in diesen wenigen Zeilen sichtbar bleiben; möglichst wenig Code allein ist kein ausreichendes Qualitätskriterium.
