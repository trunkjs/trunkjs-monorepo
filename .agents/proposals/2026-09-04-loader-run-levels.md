# Loader Run Levels und bedarfsgeladene Web Components

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-04 | dermatthes | §§ 1–9: Proposal angelegt |
| 2026-09-05 | dermatthes | § 1, § 3, § 9: globalen Window-Singleton und genau eine Loader-Instanz festgelegt |

## § 1 Kurzfassung

`@trunkjs/loader` soll Startarbeit nicht mehr als eine einzige globale Wartemenge behandeln, sondern als geordnete Run Levels ausführen. Ein Run Level startet genau einen vom Anwendungs-Bundle gelieferten Callback, wartet auf dessen Promise, zusätzliche `waitUntil`-Promises und die bereits vorhandenen `LoaderMixin`-Meldungen, und wechselt nach einem kurzen stabilen Leerlauffenster zum nächsten Level. Das verhindert, dass strukturverändernde und davon abhängige Komponenten gleichzeitig upgraden.

Der erste Implementierungsschritt bleibt bewusst klein: eine externe `LoaderRunLevelRegistry`, die von `<tj-loader>` ausgeführt wird, selektorbasiertes Überspringen unbenutzter Komponenten, konfigurierbare Zeitgrenzen und kompatible Reveal-Events. Die Registry ist pro Browser-`window` ein Singleton und über eine globale Window-Variable erreichbar, damit auch Komponenten außerhalb des `@trunkjs/loader`-Packages an derselben Loader-Instanz teilnehmen können. Automatisches Nachladen beliebiger später eingefügter SPA-Komponenten und ein neuer Decorator sind Erweiterungen, nicht Voraussetzung für die Orchestrierung. [geändert]

## § 2 Ausgangslage und Ziel

`<tj-content-pane>` wandelt flachen, überschriftenbasierten Inhalt in eine Baumstruktur um und löst dadurch DOM-Verschiebungen aus. Werden Responsive-, Layout-, Bild- und Darstellungskomponenten bereits vorher registriert, erhalten sie während dieser Umformung wiederholt `disconnectedCallback` und `connectedCallback`. Der aktuelle Loader zählt zwar `init:child-waitreq` und `init:child-ready`, unterscheidet aber keine Abhängigkeiten und entfernt nach vier Sekunden lediglich einzelne Wartende.

Ziel ist eine deterministische Reihenfolge: zuerst Struktur, anschließend größenabhängiges Layout, danach kritische Medienvorbereitung und erst dann die vorhandene Freigabe `ready → pre-visual → visual`. Nicht benötigte Komponenten sollen auf einer Seite weder importiert noch registriert werden müssen.

## § 3 Vorgeschlagene API

Die App- oder Seam-Konfiguration registriert statisch analysierbare Import-Callbacks. Der Loader kennt keine Paketnamen und keine URL-Strings. Paketinterne Aufrufe verwenden den exportierten Singleton; paketfremde Komponenten greifen über dieselbe globale Window-Referenz darauf zu. [geändert]

```ts
import { loaderRunLevels } from '@trunkjs/loader';

loaderRunLevels
  .register({
    name: 'structure',
    selector: 'tj-content-pane',
    visualStage: 'hidden',
    start: ({ waitUntil }) => {
      waitUntil(new Promise((resolve) => document.addEventListener('afterArrange', resolve, { once: true })));
      return import('@trunkjs/content-pane');
    },
  })
  .register({
    name: 'layout',
    selector: 'tj-responsive',
    visualStage: 'measurable',
    start: () => import('@trunkjs/responsive'),
  })
  .register({
    name: 'media',
    selector: 'nte-image, micx-cdn-image-loader',
    visualStage: 'measurable',
    settleMs: 100,
    timeoutMs: 4000,
    start: () => import('./image-components'),
  });

// Für Komponenten, die @trunkjs/loader nicht importieren:
window.trunkjsLoader.register({
  name: 'external-feature',
  selector: 'my-external-component',
  start: () => import('./my-external-component'),
});
```

Die öffentliche globale Referenz `window.trunkjsLoader` zeigt immer auf exakt dieselbe Registry-/Loader-Instanz wie der Paketexport `loaderRunLevels`. Beim Initialisieren wird eine bereits vorhandene Instanz wiederverwendet; nur wenn noch keine existiert, wird sie erzeugt und global veröffentlicht. Damit dürfen auch mehrere Bundles oder versehentlich mehrfach eingebundene Kopien von `@trunkjs/loader` niemals konkurrierende Registries erzeugen. Die globale Referenz ist Teil des öffentlichen Integrationsvertrags und darf nach ihrer Initialisierung nicht durch eine zweite Loader-Instanz ersetzt werden. [neu]

Auch auf DOM-Ebene darf es pro `window` nur einen aktiven `<tj-loader>` geben. Das zuerst aktive Loader-Element übernimmt die Ausführung der globalen Registry; ein weiteres `<tj-loader>` darf keine zweite Pipeline starten oder eigenen Zustand führen, sondern muss die bestehende Instanz erkennen und einen eindeutigen Diagnosefehler beziehungsweise ein Diagnoseevent ausgeben. Externe Komponenten schließen sich ausschließlich an den globalen Singleton an und nicht an ein konkretes Loader-Element. [neu]

`start` wird genau einmal aufgerufen. Sein Rückgabewert ist automatisch ein Fulfillment-Blocker. `waitUntil` erlaubt, Event-Promises vor dem dynamischen Import zu registrieren, sodass ein synchron beim Upgrade ausgelöstes Event nicht verpasst wird. `selector` wird nach `DOMContentLoaded` geprüft und spart den Import vollständig, wenn keine passende Komponente vorhanden ist. Ablehnungen und der harte Timeout werden gemeldet; die nächste Stufe läuft trotzdem weiter.

## § 4 Run Levels und Visual Stages

Run-Level-Namen sind anwendungsspezifisch, folgende Konvention wird empfohlen:

| Run Level | Aufgabe | Typische Komponenten | Visual Stage |
|---|---|---|---|
| `structure` | Inhaltsbaum und Slots herstellen | Content Pane, Markdown-Nachbearbeitung | `hidden` |
| `layout` | Breakpoints, Container und Layout initialisieren | Responsive Framework, Layout-Elemente | `measurable` |
| `media` | Größenabhängige Quellen wählen | Image Loader/Renderer | `measurable` |
| `enhance` | Nicht kritische Interaktion aktivieren | Slider, Dialoge, Navigation | `visible` oder nach `visual` |

Run Levels und Visual Stages sind absichtlich getrennt. Ein Run Level beschreibt Abhängigkeiten; `data-loader-visual-stage="hidden|measurable|visible"` ist nur ein CSS-Hook. `hidden` kann im Seiten-CSS mit `display:none` umgesetzt werden, wenn keine Messung nötig ist. `measurable` sollte Layout zulassen und typischerweise über `visibility:hidden` beziehungsweise den vorhandenen Loader-Overlay verborgen werden. `visible` folgt mit `pre-visual`.

CSS Cascade Layers (`@layer`) regeln Priorität in der Kaskade, nicht zeitliche Ausführung. Sie können ergänzend für Loader-CSS genutzt werden, sollen aber nicht als Run-Level-Mechanismus dienen.

## § 5 Erfüllung und Timeout

Jedes Level ist erfüllt, sobald der Starter, alle mit `waitUntil` angemeldeten Promises und alle aktuell über `LoaderMixin` wartenden Elemente abgeschlossen sind und anschließend standardmäßig 100 Millisekunden keine neue Aktivität entsteht. Sobald Aktivität gemeldet wurde, gilt der harte Level-Timeout von standardmäßig vier Sekunden. Beim Timeout werden die noch offenen Einträge protokolliert, das Level erhält `timed-out`, und die Pipeline läuft weiter.

Die Registry sendet `loader:run-level-start` und `loader:run-level-complete`. Das Abschlussdetail enthält Name, Index, Status, Laufzeit, Fehlerzahl und Zahl der beim Timeout noch wartenden Elemente. Damit können Seam-Seiten Fortschritt und Diagnose anzeigen, ohne den Controller zu kennen.

## § 6 Vite, Bundles und CSS

Ein literaler dynamischer Import wie `() => import('@trunkjs/content-pane')` ist ein Code-Split-Punkt im konsumierenden Vite-App-Build. Die Importfunktion muss deshalb in der App-/Seam-Konfiguration stehen; ein zur Laufzeit zusammengesetzter Paketstring ist für Vite nicht zuverlässig analysierbar. `import.meta.glob` ist die Alternative für ein bekanntes Dateimuster.

Vite extrahiert bei aktiviertem `build.cssCodeSplit` CSS eines asynchronen Chunks und lädt es zusammen mit diesem Chunk. Vite garantiert, dass der JavaScript-Chunk erst nach seinem CSS ausgewertet wird. Damit ist ein Seitentheme-Import im Komponenten-Chunk vor `customElements.define` wirksam. Zu beachten ist, dass Vite im Library Mode `cssCodeSplit` standardmäßig deaktiviert; die entscheidende Aufteilung sollte daher im finalen Website-Build geprüft werden. Bereits verwendetes Shadow-DOM-CSS über `scss?inline` bleibt als String im JavaScript-Modul und wird beim Klassenaufbau vor der Registrierung gesetzt.

Quellen: [Vite CSS Code Splitting](https://vite.dev/guide/features#css-code-splitting), [Vite Build Options](https://vite.dev/config/build-options#build-csscodesplit), [Vite Dynamic Import](https://vite.dev/guide/features#dynamic-import).

## § 7 Lazy Custom Elements

Ein Platzhalter-Decorator, der zuerst eine Proxy-Klasse unter dem endgültigen Tag registriert und diese später ersetzt, ist nicht möglich: `CustomElementRegistry.define()` wirft bei einem bereits vergebenen Namen `NotSupportedError`. Der Proxy bliebe dauerhaft die registrierte Klasse und müsste sämtliche Lifecycle-, Shadow-DOM-, Property- und Form-Semantik delegieren; das ist komplexer als der Nutzen.

Empfohlen ist stattdessen ein Manifest aus Tag, Selektor und literaler Importfunktion. Der echte Tag bleibt bis zum Import undefiniert. Nach dem Import wertet `customElements.define()` die vorhandenen Elemente auf; `customElements.whenDefined()` kann als zusätzlicher Blocker dienen. Die Registry implementiert zunächst das einfache Seiten-Scanning über `selector`. Ein späterer `MutationObserver` kann dasselbe Manifest für SPA-Navigation verwenden, ohne Proxy-Elemente einzuführen.

Quelle: [HTML Standard: Custom Elements](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-api).

## § 8 Bilder und Rendering

`display:none`, `visibility:hidden` und `content-visibility` sind Rendering- beziehungsweise Layoutmechanismen und keine belastbare Netzwerksperre für bereits im HTML vorhandene `<img src>`-Ressourcen. Das Proposal verlässt sich deshalb nicht darauf, Bilddownloads über Visual Stages zu verhindern. Wenn der Request garantiert erst im `media`-Level beginnen soll, muss der initiale Markup-Generator `loading="lazy"` bereits setzen oder die URL bis zur Aktivierung in `data-src` halten. `content-visibility:auto` eignet sich später zur Render-Arbeitsreduktion, ersetzt aber weder die Run-Level-Reihenfolge noch explizite Bild-Ladepolitik.

## § 9 Einführung und Abnahmekriterien

Die Einführung erfolgt kompatibel: Ohne registrierte Levels führt die Registry ein implizites `legacy`-Level mit dem bisherigen Element-Warten aus; `ready`, `pre-visual`, `visual` und die zugehörigen Klassen bleiben bestehen. Osman kann seine bestehende Inline-CSS-Konfiguration schrittweise auf `data-loader-visual-stage` erweitern.

Als nächster Integrationsschritt wird in einer realen Seam-/Osman-Seite die Reihenfolge `content-pane → responsive/layout → image` konfiguriert und im Vite-Produktions-Build verifiziert. Abgenommen ist die Änderung, wenn die Chunks getrennt sind, abwesende Tags keinen Chunk anfordern, Content Pane nur einmal arrangiert, nachgelagerte Elemente während des Arrangierens keine zusätzlichen Connect/Disconnect-Zyklen erhalten, Komponenten-CSS vor dem Upgrade aktiv ist und Timeout-Diagnosen die Seite trotzdem bis `visual` freigeben. Zusätzlich muss nachgewiesen werden, dass Paketexport und `window.trunkjsLoader` dieselbe Objektidentität besitzen, eine paketfremde Komponente sich ausschließlich über die Window-API erfolgreich registrieren beziehungsweise an Wartezustände anschließen kann und eine zweite Paketkopie oder ein zweites `<tj-loader>` keine zweite Registry, Pipeline oder konkurrierenden Loader-Zustand erzeugt. [geändert]
