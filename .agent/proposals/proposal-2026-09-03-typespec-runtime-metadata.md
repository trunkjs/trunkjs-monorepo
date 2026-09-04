# Proposal: TypeSpec – ein langlebiger Interaktions-Contract für Web Components

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-03 | dermatthes | §§ 1–21: Erstanlage des TypeSpec-Proposals. |
| 2026-09-04 | dermatthes | §§ 1–21: Demo Viewer und TypeSpec entkoppelt, minimale Beispiele definiert und atomare historische Snapshots ergänzt. |
| 2026-09-04 | dermatthes | §§ 1–21: Compiler-Discovery ausschließlich auf TypeSpec-TS begrenzt; Demo-TS vollständig aus Compiler und Build-Pipeline entfernt. |
| 2026-09-04 | dermatthes | §§ 1–21: UI-unabhängigen Element-Resolver als TypeSpec-Core definiert und vorerst als separaten Export im TypeSpec-Paket verortet. |
| 2026-09-04 | dermatthes | §§ 1–21: MVP auf Vite-Plugin, lazy Development Launcher, Registry/Resolver, DOM-Auswahl und live editierbare Komponentenfelder konkretisiert. |
| 2026-09-04 | dermatthes | § 8, § 17, § 19: Auto-Modus auf hostname localhost, internen Session-Umschalter und vollständige UI-Deaktivierung konkretisiert. |
| 2026-09-04 | dermatthes | § 8, §§ 12–13, §§ 17–19: Leeres Dev-Viewer-Element als Bootstrap und optional begrenzte, selbstexkludierende Dokumentbeobachtung definiert. |

Status: Entwurf
Arbeitstitel: TypeSpec

## § 1 Kurzfassung

TrunkJS soll seine Web Components einmal beschreiben und diese Beschreibung für vier zusammenhängende Aufgaben nutzen:

1. Entwickler erstellen Komponenten und ausführbare Beispiele mit guter TypeScript-Unterstützung, sofortigem Feedback und möglichst wenig doppelter Pflege.
2. Designer wählen Komponenten direkt auf einer laufenden Kundenseite aus, verändern sie in einer sicheren Entwurfssitzung, reagieren auf Zustände und stellen daraus Seitenabschnitte zusammen.
3. KI-Systeme können zunächst aus einem vollständig serialisierbaren Katalog gültige Seitenentwürfe vorbereiten.
4. Später können KI-Assistenten über dieselben typisierten Operationen mit der laufenden Seite zusammenarbeiten, die auch das Designer-Werkzeug nutzt.

TypeSpec ist damit nicht nur ein Dokumentationsformat. Es ist der versionierte Contract zwischen Komponenten-Quellcode, Build-Werkzeug, visueller Bearbeitung und maschineller Interaktion. Demos sind optionale, eigenständige Inhalte und keine Voraussetzung für eine TypeSpec.

Die TypeScript-Authoring-Quelle darf komfortable Runtime-Helfer enthalten. Der Build erzeugt daraus jedoch zusätzlich einen deterministischen, validierbaren und unveränderlichen JSON-Katalog. Darüber hinaus muss ein Projekt einen atomaren, selbstenthaltenden Snapshot exportieren können, der in das Kunden- oder Applikationsrepository eingecheckt wird. Eine veröffentlichte Katalog- oder Snapshot-Version wird nie überschrieben. Wartung erzeugt eine neue Version; alte Seiten bleiben auf ihre bisherige Version und deren Integritäts-Hash festgelegt. Der Snapshot enthält alle zum späteren Lesen und Darstellen benötigten TypeSpec-Daten, Schemas, Runtime-Bausteine und referenzierten Komponenten-Assets, sodass er weder von der aktuell installierten TypeSpec- noch von der aktuell installierten Komponenten- oder Framework-Version abhängt. So können bereits kompilierte Kundenseiten und frühere Komponentenstände über Jahre reproduzierbar geöffnet werden, während Compiler, Viewer, Bootstrap und Komponenten weiterentwickelt werden.

`TypeSpec` bleibt ein Arbeitstitel. Microsoft verwendet den Namen bereits für seine API-Beschreibungssprache; vor Veröffentlichung muss ein eindeutiger Name gewählt werden.

## § 2 Leitprinzipien

### § 2.1 Eine Quelle, mehrere Projektionen

Der TypeSpec-Compiler entdeckt und lädt ausschließlich `*.typespec.ts` sowie ausdrücklich benannte TypeSpec-Varianten wie `*.theme.typespec.ts` und `*.project.typespec.ts`. Er scannt weder Custom Elements Manifests noch `*.demo.ts`-Dateien und importiert keine Demo-Viewer-Pakete. Die TypeSpec-Datei ist damit die einzige Authoring-Eingabe des Compilers.

Technisch ableitbare Komponenteninformationen können innerhalb einer TypeSpec-Datei über typisierte Authoring-Helfer ausdrücklich aus einem CEM-Objekt übernommen werden. Diese Übernahme ist Teil der TypeSpec-Definition; sie ist keine zweite Discovery-Pipeline des Compilers. Ebenso werden Beschreibungen sowie Markdown-, HTML- oder Code-Beispiele direkt in der TypeSpec definiert.

Aus dieser einen Authoring-Schicht entstehen verschiedene Projektionen: Runtime-Registry, Designer-UI, statischer Katalog, AI-Kontext und später Tool-Definitionen. Keine Projektion wird zur zweiten handgepflegten Quelle.

### § 2.2 Eigenständige Projekte, optionale Bridge

TypeSpec und Demo Viewer werden zunächst als eigenständige Projekte mit unabhängigen APIs, Release-Zyklen, Build-Pipelines und Entwicklungszielen behandelt. Da beide noch in Entwicklung sind, darf eine Änderung oder ein unvollständiger Zwischenstand des einen Projekts das andere standardmäßig weder blockieren noch funktional beeinflussen. Zwischen beiden besteht deshalb keine feste Laufzeit-, Build- oder Authoring-Abhängigkeit.

Eine optionale Bridge darf TypeSpec-Metadaten für den Demo Viewer aufbereiten oder Demo-Viewer-Funktionen auf explizit vorhandene TypeSpec-Daten abbilden. Diese Integrationsschicht wird vorzugsweise auf Seiten des Demo Viewers verortet und hängt von TypeSpec ab, nicht umgekehrt. Der TypeSpec-Kern kennt weder `defineDemo()` noch Demo-Viewer-Controls oder dessen Runtime-Lebenszyklus.

### § 2.3 Menschen und KI verwenden dieselbe Engine

Viewer, Designer-Werkzeug und spätere KI-Bridges dürfen den DOM nicht jeweils auf eigene Art verändern. Alle Änderungen laufen durch eine gemeinsame, typisierte Command-Engine. Dadurch gelten dieselben Constraints, Berechtigungen, Transaktionen, Undo-Regeln und Validierungen unabhängig davon, ob ein Mensch klickt oder ein Assistent eine Operation anfragt.

### § 2.4 Entwurf vor Wirkung

Lesen, Vorschau und dauerhafte Änderung sind getrennte Fähigkeiten. Bearbeitungen finden standardmäßig in einer reversiblen Draft-Session statt. Eine Vorschau darf die sichtbare Seite verändern, aber noch keine externe oder persistente Wirkung auslösen. Erst ein expliziter Commit übernimmt den validierten Entwurf. Für irreversible oder extern wirksame Aktionen ist zusätzlich eine Bestätigung erforderlich.

### § 2.5 Deklarativ zuerst, Runtime als Escape-Hatch

Alles, was Constraints, Controls, Beispiele und Operationen beschreibt, soll bevorzugt serialisierbar sein. Deklarative Regeln können im Build geprüft, in JSON exportiert, von Designern verstanden und von KI-Systemen sicher verwendet werden. Callbacks bleiben möglich, müssen aber explizit als `runtimeOnly` gelten und erhalten keine stillschweigende maschinelle Ausführbarkeit.

### § 2.6 Unveränderliche Releases statt eingefrorener Toolchains

Eine über Jahre stabile Seite benötigt keinen für immer unveränderten Compiler. Sie benötigt einen unveränderlichen, selbstbeschreibenden Release-Artefakt mit festem Schema, eindeutigen Versionen, Integritätswerten und getesteten Readern beziehungsweise Migrationen. Neue Builds ergänzen alte Artefakte, sie ersetzen sie nicht.

### § 2.7 Projektlokale, atomare Snapshots

Jeder Consumer kann den vollständigen effektiven TypeSpec-Stand atomar in ein neues Zielverzeichnis exportieren. Der Export wird erst nach vollständiger Erzeugung und Validierung sichtbar und enthält ein Manifest, das alle Dateien und Digests des Snapshots bindet. Das Ergebnis ist als unveränderliches Verzeichnis oder Archiv in ein Kunden- beziehungsweise Applikationsrepository eincheckbar.

Ein Snapshot ist selbstenthaltend: Er referenziert keine unversionierten Dateien aus `node_modules`, keine veränderlichen CDN-URLs und keinen global installierten Reader. Er enthält neben Katalog und Schemas auch die für die historische Darstellung benötigte kompatible Reader-/Runtime-Version sowie gebündelte Komponentenmodule, Styles und Assets oder digest-gepinnte, dauerhaft verfügbare Artefakte. Ein Projekt muss dadurch nach einem Upgrade weiterhin den vorherigen Stand öffnen und mit dessen damaliger Darstellung vergleichen können.

## § 3 Nutzer und zentrale Abläufe

### § 3.1 Komponentenentwickler

Ein Entwickler implementiert eine Komponente und beschreibt den vollständigen Compiler-Input in einer `*.typespec.ts`. Technisch ableitbare API-Daten kann diese Datei über einen typisierten Authoring-Helfer ausdrücklich aus einem CEM-Objekt übernehmen; Demos bleiben außerhalb der TypeSpec-Discovery und Katalogerzeugung.

Der typische Ablauf soll sein:

1. Komponente und `*.typespec.ts` anlegen oder ändern.
2. Ableitbare CEM-Daten bei Bedarf ausdrücklich innerhalb der TypeSpec übernehmen und dort um semantische Angaben ergänzen.
3. Im Vite-Dev-Server Komponente, TypeSpec-Controls, Constraints und Export per HMR prüfen.
4. Mit `typespec check` verständliche, quellbezogene Diagnosen erhalten.
5. Mit `typespec diff` erkennen, ob sich der veröffentlichte Contract kompatibel oder brechend verändert.
6. Einen deterministischen Katalog bauen und in CI gegen Schema, Beispiele und Golden Files prüfen.

### § 3.2 Demo- und Beispielautoren

Demos müssen unabhängig von TypeSpec und unabhängig vom Demo Viewer angelegt werden können. Für den normalen Dokumentationsfall genügt ein eigenständiges Beispiel aus:

- einer Beschreibung,
- einem Markdown- oder HTML-Fragment,
- alternativ einem kurzen Code-Snippet.

Diese einfache Demo benötigt weder `defineDemo()` noch TypeSpec-spezifische Controls, Zustandsmodelle, Runtime-Hooks oder einen laufenden Demo Viewer. Sie darf in einer Komponenten-Dokumentation, neben der Komponente oder in einem beliebigen Dokumentationssystem liegen.

Wenn eine Demo interaktive Controls, isolierte Ausführung oder komplexe Zustände benötigt, kann sie weiterhin die eigenständige Authoring-API des Demo Viewers verwenden. Möchte der Demo Viewer zusätzlich TypeSpec-Daten anzeigen oder verwenden, geschieht dies ausschließlich über die optionale Bridge. Erweiterte TypeSpec-Funktionalität ist für eine Demo kein Vollständigkeits- oder Akzeptanzkriterium.

### § 3.3 Designer in Kundensitzungen

Ein Designer arbeitet auf der tatsächlichen oder einer realistischen Vorschauseite, nicht in einer davon getrennten Dokumentationswelt. Der Launcher erlaubt die Auswahl geeigneter Elemente; der Inspector zeigt nur die für die aktuelle Instanz gültigen Optionen. Ein Composer ergänzt strukturelle Operationen wie Einfügen, Verschieben, Duplizieren und Entfernen, soweit Slots und Kompositionsregeln dies erlauben.

Der Ablauf einer Live-Session soll sein:

1. Seite und gewünschte Katalogversion öffnen.
2. Draft-Session beginnen und Ziel-Viewport, Theme, Locale oder Beispieldaten wählen.
3. Komponente per Hover, Tastatur oder Elementbaum auswählen.
4. Attributes, Properties, Tokens, Modifier, Inhalte und Slots über geeignete Controls verändern.
5. Auf Breakpoints, Containergrößen, Events, Lade-, Leer-, Fehler- und Erfolgszustände reagieren.
6. Jede Änderung sofort sehen, einzeln oder als Gruppe rückgängig machen und Varianten vergleichen.
7. Den Entwurf validieren und als reproduzierbares Page Document oder als Patch exportieren.
8. Erst nach bewusster Freigabe an eine projektspezifische Persistenz- oder Publishing-Schicht übergeben.

TypeSpec selbst ist dabei nicht das CMS. Es liefert den stabilen Komponenten-, Zustands- und Operationsvertrag, auf dem ein projektspezifischer Editor oder eine Kundenplattform aufbauen kann.

### § 3.4 KI-gestützte Vorbereitung und Assistenz

In der ersten Stufe erhält eine KI den statischen Katalog, ein Page Document und die zugehörigen JSON Schemas. Sie kann daraus einen Entwurf oder eine Folge deklarativer Operationen erzeugen. Diese Ausgabe wird ohne JavaScript-Ausführung validiert und kann anschließend von einem Menschen im Designer-Werkzeug geöffnet werden.

In einer späteren Stufe exponiert die laufende Seite dieselben Lese- und Draft-Operationen als Tools. Die KI inspiziert damit die aktuelle Seite, schlägt Änderungen vor, wendet sie in einer Vorschau an und lässt sie durch den Menschen bestätigen. Sie steuert nicht den sichtbaren Inspector fern und führt kein beliebiges DOM-Scripting aus.

## § 4 Authoring-Contract

### § 4.1 Dateiaufteilung

Eine Komponente kann ihre TypeSpec neben Implementierung und Demos ablegen:

```text
nt2-two-col/
  nt2-two-col.ts
  nt2-two-col.css
  nt2-two-col.typespec.ts   # einziger Compiler-Einstieg; enthält auch minimale Beispiele
```

Die Zuordnung erfolgt über stabile Component- und Example-IDs, nicht allein über Dateipfade. Pfade bleiben Provenance und Diagnosehilfe, dürfen aber nicht die langlebige Identität eines veröffentlichten Eintrags sein.

### § 4.2 TypeScript-DX

`defineTypeSpec()` soll den Elementtyp inferieren, literale IDs erhalten und Referenzen typprüfen. Unbekannte Attribute, doppelte IDs, ungültige Slot-Verweise, zyklische Komposition und nicht auflösbare Actions sind Build-Fehler.

Konzeptionell:

```ts
import { defineTypeSpec } from '@trunkjs/typespec';
import type { Nt2TwoColElement } from './nt2-two-col.js';

export default defineTypeSpec<Nt2TwoColElement>({
  id: '@trunkjs/components/nt2-two-col',
  tagName: 'nt2-two-col',
  title: 'Zweispaltiges Layout',

  editor: {
    groups: [
      {
        id: 'layout',
        title: 'Layout',
        fields: ['modifier.reverse', 'token.gap'],
      },
    ],
  },

  modifiers: {
    reverse: {
      class: 'nt2-two-col--reverse',
      title: 'Reihenfolge umkehren',
      description: 'Vertauscht die visuelle Spaltenreihenfolge.',
    },
  },

  tokens: {
    gap: {
      cssProperty: '--nt2-two-col-gap',
      valueSchema: {
        type: 'string',
        pattern: '^[0-9.]+(rem|px|%)$',
      },
      ui: { control: 'length', step: 0.25, unit: 'rem' },
      default: '2rem',
    },
  },

  slots: {
    primary: {
      accepts: ['@trunkjs/content/*'],
      minItems: 1,
      maxItems: 1,
    },
    secondary: {
      accepts: ['@trunkjs/content/*'],
      minItems: 0,
      maxItems: 1,
    },
  },
});
```

Die konkrete Syntax ist noch zu validieren. Entscheidend sind stabile IDs, Type-Inferenz, Quellbezug und die Trennung von Daten-Schema und UI-Hinweisen.

### § 4.3 Ableitung statt Doppelpflege

Der Compiler komponiert ausschließlich explizit geladene TypeSpec-Module anhand stabiler IDs:

1. `*.typespec.ts` liefert den vollständigen Komponenten-Contract einschließlich minimaler Beispiele.
2. Ein TypeSpec-Modul darf technisch beobachtbare Komponenten-API über einen typisierten Helfer aus einem ausdrücklich importierten CEM-Objekt übernehmen.
3. `*.theme.typespec.ts` und `*.project.typespec.ts` ergänzen oder überschreiben Einträge explizit.
4. `*.demo.ts`, `defineDemo()` und Demo-Viewer-Metadaten werden weder entdeckt noch gelesen noch in den Katalog übernommen.

Widerspricht eine manuelle Angabe der innerhalb der TypeSpec übernommenen API, meldet der Build einen Fehler oder verlangt einen expliziten Override mit Begründung. Stilles Last-write-wins ist nicht zulässig.

### § 4.4 Diagnostik und Tooling

Die Mindest-DX umfasst:

- `typespec check` für Schema-, Referenz-, Constraint- und Exportprüfung,
- `typespec build` für Runtime-Registry und statischen Katalog,
- `typespec diff <alt> <neu>` mit Einordnung in kompatibel, potenziell brechend und brechend,
- Quellpfad, Zeile, Component-ID und JSON Pointer in jeder Diagnose,
- HMR ausschließlich für geänderte TypeSpec-Module ohne vollständigen Reload,
- eine Inspector-Ansicht für den effektiven, komponierten Contract und seine Provenance,
- Golden-Tests, die Byte-Stabilität und die Lesbarkeit älterer Kataloge prüfen.

Die Befehlsnamen sind konzeptionell; sie können als Nx-Targets und über das Vite-Plugin angeboten werden.

## § 5 Komponenten-, Zustands- und Control-Modell

### § 5.1 Komponentenoberfläche

Der Contract soll mindestens abbilden:

- Attributes und Properties,
- Events und öffentlich erlaubte Actions,
- Slots sowie erlaubte Kind-Komponenten und Kardinalitäten,
- CSS Custom Properties beziehungsweise Design Tokens,
- CSS Parts und Custom States,
- Modifier-Klassen,
- editierbare Texte, Rich-Content- oder Asset-Referenzen,
- Beschreibungen, Typen, Defaults, Beispiele und Deprecations,
- Barrierefreiheitsanforderungen und relevante semantische Rollen.

### § 5.2 Werte-Schema und UI-Hinweise

Jedes editierbare Feld besitzt ein serialisierbares `valueSchema`, vorzugsweise JSON Schema 2020-12, und optional ein `ui`-Objekt. Das Schema definiert, was gültig ist; UI-Hinweise definieren nur, wie ein menschlicher Editor einen Wert komfortabel anbietet. Eine KI darf sich auf das Schema verlassen, nicht auf die Darstellung eines Sliders oder Pickers.

UI-Hinweise können Control-Typ, Einheit, Schrittweite, Gruppierung, Reihenfolge, Hilfe, Vorschaubild oder responsive Eingabe vorschlagen. Unbekannte UI-Hinweise dürfen von Readern ignoriert werden, ohne die Datenvalidierung zu verändern.

### § 5.3 Deklarative Constraints

Gültigkeit ist mehr als ein Boolean. Eine Regel soll einen strukturierten Befund liefern können:

```ts
constraints: [
  {
    id: 'compact-without-hero',
    when: {
      not: { class: 'nt2-two-col--hero' },
    },
    appliesTo: ['modifier.compact'],
    message: 'Compact ist für die Hero-Variante nicht verfügbar.',
    severity: 'error',
  },
]
```

Ein Befund enthält mindestens `valid`, `constraintId`, `message`, `severity` und betroffene Pfade. Der Designer kann dadurch erklären, warum etwas gesperrt ist; eine KI erhält dieselbe Begründung und kann Alternativen wählen.

Für Sonderfälle bleibt ein Callback möglich:

```ts
valid(element, context) {
  return element.dataset.mode !== 'hero' || {
    valid: false,
    message: 'Compact ist im Hero-Modus nicht verfügbar.',
  };
}
```

Der Callback muss seine Abhängigkeiten deklarieren oder über eine explizite `invalidate()`-/`subscribe()`-Anbindung aktualisiert werden. Er wird im statischen Export als Runtime-only markiert. Die UI darf nicht durch unkontrolliertes Polling versuchen, ihn aktuell zu halten.

### § 5.4 Reaktive Kontexte

Constraints und Controls können von einem klar begrenzten Runtime-Kontext abhängen:

- Instanzzustand und Custom States,
- Attributes, Properties, Klassen und Tokens,
- Slot-Belegung und Kindstruktur,
- Viewport und Containergröße,
- Theme, Farbschema und Locale,
- Benutzerrolle beziehungsweise freigegebene Fähigkeiten,
- Beispieldaten und Zustände wie loading, empty, error und success,
- deklarierte Komponenten-Events.

Die Runtime beobachtet nur deklarierte Abhängigkeiten, etwa über Komponenten-Events, `MutationObserver`, `ResizeObserver`, `matchMedia` oder eine explizite Subscription. Ein Update erzeugt einen neuen, monotonen `revision`-Wert für die betroffene Instanz, damit UI und spätere Tool-Aufrufe veraltete Zustände erkennen können.

## § 6 Beispiele und Szenarien

### § 6.1 Minimaler, viewer-unabhängiger Demo-Contract

TypeSpec darf Beispiele referenzieren, setzt jedoch keine bestimmte Demo-Runtime voraus. Der kleinste portable Beispiel-Eintrag besteht aus stabiler ID, Titel oder Beschreibung und genau einem darstellbaren Inhalt:

```ts
examples: [
  {
    id: '@trunkjs/components/nt2-two-col/examples/default',
    title: 'Standarddarstellung',
    description: 'Zweispaltiges Layout mit optionaler Seitenspalte.',
    content: {
      kind: 'html',
      source: '<nt2-two-col>...</nt2-two-col>',
    },
  },
]
```

Als `content.kind` genügen für die erste Version `markdown`, `html` und `code`. Ein Code-Snippet kann optional seine Sprache angeben. Der Katalog darf diese Inhalte dokumentieren und anzeigen, ohne sie auszuführen. Für die erste Version liegen Beschreibung und Inhalt direkt im TypeSpec-Modul; der Compiler muss dafür keine Demo- oder Dokumentationsdateien entdecken.

### § 6.2 Erweiterte Demos über eine optionale Bridge

Ausführbare Szenarien, Controls, Reset-Logik, isolierte Frames und imperative Hooks bleiben Domäne des Demo Viewers. Eine optionale Bridge im Demo-Viewer-Projekt kann einen minimalen TypeSpec-Beispieleintrag in eine Demo-Viewer-Darstellung überführen oder zusätzliche Demo-Metadaten mit TypeSpec-IDs verknüpfen. Der Rückweg in den TypeSpec-Kern ist nicht verpflichtend: Eine Demo darf mehr, weniger oder andere Funktionen als der TypeSpec Viewer besitzen.

Die Bridge muss fehlende Funktionen degradieren können. Kann beispielsweise nur Markdown oder HTML dargestellt werden, bleibt die Demo gültig; fehlende Controls, Zustandsübergänge oder Runtime-Hooks sind kein Fehler. Ebenso bleibt TypeSpec vollständig build- und nutzbar, wenn der Demo Viewer oder die Bridge nicht installiert ist.

### § 6.3 Isolation bei ausführbaren Beispielen

Nur tatsächlich ausführbare Demos benötigen Reset- und Isolationsgarantien. Diese Garantien gehören zum jeweiligen Demo-Runner oder Demo Viewer und nicht zum TypeSpec-Kern. Statische Markdown-, HTML- und Code-Beispiele benötigen keine Runtime-Isolation.

## § 7 Komposition und Provenance

### § 7.1 Explizite Komposition

Eine TypeSpec kann eine eindeutige Basis erweitern und unabhängige Traits einbinden:

```ts
export default defineTypeSpec({
  id: '@customer/site/nt2-two-col',
  component: '@trunkjs/components/nt2-two-col',
  extends: '@trunkjs/components/nt2-two-col',
  traits: [
    '@trunkjs/theme/layout',
    '@trunkjs/theme/editorial',
  ],
  patches: [
    {
      op: 'remove',
      path: '/modifiers/fullbleed',
      from: '@trunkjs/theme/layout',
      reason: 'Im Kundenlayout nicht freigegeben.',
    },
  ],
});
```

Die Precedence ist deterministisch:

```text
Basis (`extends`)
→ Traits in deklarierter Reihenfolge
→ lokale Ergänzungen
→ explizite Patches und Overrides
```

Ein Konflikt zwischen gleichrangigen Beiträgen ist ein Build-Fehler, solange er nicht durch einen expliziten Patch aufgelöst wird. Zyklen sind verboten. Trait-Nesting erhält eine feste maximale Tiefe oder wird vollständig im Build aufgelöst.

### § 7.2 Provenance pro Feld

Jeder effektive Eintrag behält mindestens:

- Source-ID und Source-Version,
- ursprünglichen Paketnamen,
- Quelldatei und optional Quellposition,
- angewendete Overrides oder Patches,
- Digest des Ursprungsartefakts.

Der Inspector kann damit erklären, woher ein Control, Token, Constraint oder Beispiel stammt. Der statische Export ermöglicht dieselbe Nachvollziehbarkeit ohne Zugriff auf den Quellcode.

## § 8 Designer Runtime

### § 8.1 MVP Development Viewer als Bootstrap-Element

Für das MVP genügt ein leeres `<tj-typespec-dev-viewer>` an beliebiger Stelle innerhalb von `document.body`. Das zu untersuchende Dokument wird nicht in diese Web Component eingewickelt. Das Element übernimmt den kleinen Aktivierungs- und Umschalt-Loader sowie nach Aktivierung die Koordination von Registry, DOM-Inspektor und Viewer-UI.

Nur der Bootstrap-Code dieser Web Component liegt im Haupt-Chunk. Registry-Daten, TypeSpec-Module, DOM-Inspektor und die eigentliche Viewer-Oberfläche werden erst per Dynamic Import geladen, wenn der Dev Mode aktiv ist.

Das Attribut `dev-mode` besitzt drei Zustände:

- `on`: Das Development Tool ist bei jedem Host aktiv.
- `auto`: Genau wenn `location.hostname === 'localhost'` gilt, zeigt das Element unten links einen kleinen Ein-/Ausschalter und startet ohne gespeicherte Session-Ausnahme aktiv. Schema und Port spielen keine Rolle.
- `off` oder fehlendes Attribut: Das Tool bleibt inaktiv; TypeSpecs, Registry und Viewer-Chunks werden weder importiert noch ausgeführt.

Im Auto-Modus verwendet das Element einen internen, namensraumfähigen `sessionStorage`-Schlüssel. Dafür sind im MVP keine Attribute für Storage-Typ oder Schlüssel erforderlich. Der Schalter unten links bleibt auf `localhost` auch im deaktivierten Zustand sichtbar. Auf anderen Hostnamen verhält sich `auto` wie `off`.

Das optionale Attribut `selector` begrenzt den Inspektionsbereich. Ohne `selector` ist `document.body` das Root; mit `selector` wird `document.querySelector(selector)` verwendet und ausschließlich dieses Element einschließlich seiner Nachfahren beobachtet. Das Dev-Viewer-Element muss nicht innerhalb dieses Roots liegen. Liefert der Selector kein Element oder ist er syntaktisch ungültig, bleibt die Inspektion aus und der Viewer zeigt eine Diagnose; es gibt keinen stillen Fallback auf `document.body`.

Nach Aktivierung führt das Element einmal eine vollständige Suche innerhalb des Roots aus. Ein `MutationObserver` verarbeitet danach inkrementell hinzugefügte und entfernte Teilbäume. Die Web Component selbst, ihr Shadow Root und alle von ihr erzeugten UI-, Portal-, Rahmen- und Button-Knoten werden über feste Ownership-Marker aus Traversierung, Hover-Erkennung und Mutation Records ausgeschlossen. Eigene Renderzyklen dürfen deshalb keine erneute Registry-Auflösung auslösen.

Mutationen am tatsächlich inspizierten Zielelement bleiben beobachtbar, auch wenn sie durch eine Viewer-Operation entstanden sind. Der Core markiert solche Operationen mit einer Revisions-ID, bündelt die daraus entstehenden Mutation Records und löst das Ziel genau einmal nach Abschluss der Operation neu auf. So werden dynamische Contracts aktualisiert, ohne Rückkopplungs- oder Endlosschleifen zu erzeugen.

Beim Aktivieren startet das Element Registry und DOM-Beobachtung. Beim Deaktivieren trennt es den Observer, entfernt Highlights und Auswahlbuttons und verbirgt seine eigene Viewer-Oberfläche. Bereits importierte Browsermodule bleiben technisch geladen, werden aber nicht mehr ausgeführt; nach einem Reload verhindert der Session-Status den Dynamic Import.

Beim Pointer-Hover wird das Ziel mit vier schmalen, transparenten Randsegmenten außerhalb des Inhaltsbereichs markiert. Sie verwenden `pointer-events: none`; es gibt keine gefüllte Overlay-Fläche über dem Element. Eine danebenliegende Schaltfläche öffnet die Viewer-Oberfläche. Deren Darstellung als `sidebar` oder `overlay` bleibt konfigurierbar.

Die Oberfläche zeigt Beschreibung, Links, Class Groups, Modifier beziehungsweise Feature-Klassen und CSS Custom Properties. Änderungen laufen über Core-Operationen, werden auf das Ziel angewendet und lösen anschließend genau eine erneute Auflösung des effektiven Contracts aus.

### § 8.2 UI-unabhängiger Element-Resolver

Die Auflösung einer TypeSpec für ein konkretes HTML-Element ist eine eigenständige Core-Fähigkeit und nicht Teil der Visualisierung. Der Core erhält ein `HTMLElement`, ermittelt anhand von Tag Name, stabiler Component-ID, aktivem Theme, Projekt-Contract und zustandsabhängigen Bedingungen alle aktuell anwendbaren TypeSpec-Beiträge und komponiert daraus den effektiven Contract.

Das Ergebnis beantwortet in einem Aufruf:

- ob für das Element überhaupt eine TypeSpec vorliegt,
- welche Component-, Theme-, Trait- und Project-TypeSpecs aktuell angewendet werden,
- welche Provenance und Version jeder Beitrag besitzt,
- welcher effektive, konfliktbereinigte Contract für Controls, Class Groups, Modifier, Slots, Constraints und Beispiele gilt,
- welche monotone Revision diesen Zustand beschreibt.

Der Resolver ist wiederholbar und beobachtbar. Nach Änderungen an Attributes, Klassen, Custom States, Slot-Belegung, Theme, Container- oder Viewport-Kontext wird erneut aufgelöst; nicht beobachtbare Property- oder interne Zustandsänderungen können durch eine explizite Invalidierung gemeldet werden. Viewer erhalten ausschließlich das Ergebnis und rendern daraus ihre Oberfläche. Der Core erzeugt selbst keine Eingabefelder, Overlays oder sonstige Visualisierung.

Vorerst wird diese Fähigkeit als logisch getrennter Export `@trunkjs/typespec/core` im bestehenden Paket implementiert. Die API darf später ohne Änderung ihres Contracts in ein eigenes Paket `@trunkjs/typespec-core` verschoben werden. TypeSpec Viewer, projektspezifische Editoren und eine optionale Demo-Viewer-Bridge sind gleichrangige Clients dieses Core-Exports; der Core hängt von keinem dieser Clients ab.

### § 8.3 Auswahl und Inspektion

Der Launcher wird einmal in die Seite integriert. Er nutzt einen kleinen Index, um TypeSpec-fähige Elemente zu erkennen, ohne sämtliche Detail-Chunks zu laden. Auswahl muss per Pointer, Tastatur und Elementbaum möglich sein und auch Shadow DOM, dynamisch eingefügte Elemente und eingebettete Vorschau-Frames berücksichtigen, soweit dieselbe Origin und Berechtigung dies erlauben.

Highlighting und Overlays dürfen Layout, Events und Accessibility Tree der Kundenseite nicht unbeabsichtigt verändern. Der Inspector lädt erst nach Auswahl die effektive TypeSpec der konkreten Instanz.

### § 8.4 Inspector und Composer

Der Inspector erzeugt Controls aus `valueSchema`, UI-Hinweisen und aktuellem Constraint-Ergebnis. Er zeigt mindestens:

- aktuellen, Default- und geänderten Wert,
- Herkunft und Beschreibung,
- Gültigkeit einschließlich Begründung,
- responsive oder zustandsabhängige Werte,
- ausgelöste Events und betroffene Abhängigkeiten,
- verfügbare Beispiele und Recipes,
- die resultierenden Operationen beziehungsweise den Diff.

Der Composer arbeitet auf derselben Engine und ergänzt strukturverändernde Operationen. Slots definieren, welche Komponenten eingefügt werden dürfen und wie viele. Recipes liefern valide Ausgangsbäume. Freies HTML oder beliebige Script-Fragmente sind keine regulären Composer-Eingaben.

### § 8.5 Draft-Session und History

Eine Draft-Session besitzt eine ID, die zugrunde liegende Katalog-ID, eine Page-Revision und eine geordnete History typisierter Operationen. Unterstützt werden mindestens:

- `set` und `unset` für editierbare Werte,
- `insert`, `move`, `duplicate` und `remove` für freigegebene Strukturen,
- `invoke` für explizit erlaubte, nicht beliebige Komponenten-Actions,
- Gruppierung mehrerer Operationen zu einer atomaren Transaktion,
- Undo, Redo, Reset, Validate, Export und Commit.

Jede Operation enthält Zielreferenz, erwartete Revision und validierbare Eingaben. Bei einer veralteten Revision wird nicht still überschrieben; die Runtime liefert einen Konflikt mit aktuellem Zustand. Preview-Operationen dürfen keine als extern oder irreversibel markierte Action ausführen.

### § 8.6 Page Document

Das Ergebnis einer Session ist ein serialisierbares Page Document, nicht lediglich ein DOM-Snapshot. Es referenziert Komponenten über stabile IDs und Katalogversionen und enthält einen validierten Komponentenbaum, Inhalte, Werte, responsive Varianten und gegebenenfalls Datenbindungen.

Ein vereinfachter Ausschnitt:

```json
{
  "formatVersion": "1.0.0",
  "catalog": {
    "id": "@trunkjs/catalog",
    "version": "2026.09.0",
    "integrity": "sha256-..."
  },
  "page": {
    "id": "customer-home",
    "root": {
      "instanceId": "hero-layout",
      "component": "@trunkjs/components/nt2-two-col",
      "values": {
        "modifier.reverse": true,
        "token.gap": "2rem"
      },
      "slots": {
        "primary": [],
        "secondary": []
      }
    }
  }
}
```

Die tatsächliche Persistenz, Zusammenarbeit mehrerer Nutzer und Publikation bleiben Integrationsaufgaben. TypeSpec definiert Validierung, Reproduzierbarkeit und die Übergabegrenze.

## § 9 Gemeinsame Runtime- und Command-API

### § 9.1 Instanzreferenzen

Eine langlebige API darf keine CSS-Selektoren oder rohe `Element`-Objekte als externen Contract verwenden. Die Runtime vergibt opake, für die aktuelle Page-Session stabile `instanceId`-Werte. Jede Inspektion liefert außerdem `revision`, Component-ID und Catalog-Digest. Nach Reload dürfen IDs neu aufgelöst werden, sofern das Page Document keine projektseitig stabilen IDs bereitstellt.

### § 9.2 API-Schichten

Die Browser-API soll eine kleine, UI-unabhängige Fassade anbieten:

```ts
const page = await typeSpec.inspectPage();
const component = await typeSpec.inspect(instanceId);

const draft = await typeSpec.beginDraft({ baseRevision: page.revision });
await draft.apply([
  {
    op: 'set',
    target: instanceId,
    path: 'modifier.reverse',
    value: true,
    expectedRevision: component.revision,
  },
]);

const result = await draft.validate();
const document = await draft.export();
```

Viewer, Launcher und Composer verwenden ausschließlich diese Ebene. Projektadapter können einen validierten Draft übernehmen; `commit()` allein verspricht keine universelle CMS-Persistenz.

### § 9.3 Capability-Beschreibungen

Jede exponierbare Operation beschreibt mindestens:

- stabilen Namen und menschenlesbaren Titel,
- Zweck und Zielbereich,
- Input- und Output-Schema,
- Vorbedingungen und mögliche Constraint-Fehler,
- `readOnly`, `idempotent`, `reversible` und `previewable`,
- mögliche externe Wirkung,
- benötigte Berechtigung und Bestätigungsstufe,
- erwartete Page- und Instance-Revision.

Diese Metadaten steuern sowohl Buttons und Bestätigungsdialoge als auch spätere AI-Tools.

## § 10 Statischer Katalog und AI-Export

### § 10.1 Zwei getrennte Exporte

Der Build erzeugt zwei zueinander passende, aber getrennte Dokumentarten:

1. **Catalog**: verfügbare Komponenten, Werte, Constraints, Slots, Recipes, Beispiele und Operationen.
2. **Page Document**: eine konkrete, gegen genau einen Catalog validierte Zusammenstellung von Komponenten und Werten.

Damit kann eine KI offline einen Page-Entwurf vorbereiten, ohne eine laufende Webseite oder Runtime-Code auszuführen. Der Entwurf wird anschließend gegen Catalog und Page-Schema validiert.

### § 10.2 Katalogstruktur

Der Katalog besteht aus einem kleinen Entry-Manifest und lazy ladbaren Shards:

```text
typespec-catalog/
  catalog.json
  schemas/
    catalog.schema.json
    page.schema.json
    operations.schema.json
  components/
    <stable-component-id>.<digest>.json
  examples/
    <stable-example-id>.<digest>.json
  runtime/
    <runtime-chunk>.<digest>.js
  assets/
    <asset>.<digest>.<ext>
  integrity.json
```

### § 10.3 Atomarer Snapshot-Export

Der Befehl `typespec export --snapshot <ziel>` schreibt zunächst in ein temporäres Nachbarverzeichnis, validiert dort Schemas, interne Referenzen und sämtliche Digests und benennt das vollständige Verzeichnis anschließend atomar auf das endgültige Ziel um. Ein fehlgeschlagener Export hinterlässt den zuletzt gültigen Snapshot unverändert.

Das Snapshot-Manifest bindet mindestens Katalog, Schemas, Reader-/Runtime-Version, Komponentenmodule, Styles, Fonts, Bilder und sonstige Assets. Zusätzlich hält es die ursprünglichen Paketversionen und die Source-Revision fest. Das Verzeichnis kann beispielsweise unter `vendor/typespec/<catalogVersion>/` oder `artifacts/typespec/<digest>/` in einem Kunden- beziehungsweise Applikationsrepository eingecheckt werden. Ein Checkout dieses Repositories genügt, um den historischen Stand ohne Installation der damaligen NPM-Pakete zu öffnen.

`catalog.json` enthält nur Suchindex, Versionsinformationen, Capability-Übersicht und Verweise. Detaildaten und Runtime-Chunks werden erst bei Bedarf geladen. Alle internen Verweise sind relativ oder über stabile IDs auflösbar; das Artefakt funktioniert ohne Build-Service und ohne unversionierte Remote-Schemas.

### § 10.4 Versionsfelder

Mindestens folgende Versionen sind getrennt:

- `formatVersion`: SemVer des serialisierten TypeSpec-Formats,
- `runtimeApiVersion`: Version der Browser-/Command-API,
- `catalogVersion`: fachliche Release-Version dieses Katalogs,
- `componentVersion`: veröffentlichte Version des Ursprungspakets,
- `producer`: Name und Version des Compilers,
- `sourceRevision`: Commit oder Release-Referenz,
- `integrity`: Digest des kanonischen Inhalts.

Ein Reader darf nicht aus der Compiler-Version auf das Datenformat schließen. Für jedes Major-Format wird ein unveränderliches JSON Schema mit stabiler `$id` veröffentlicht.

### § 10.5 Determinismus und Integrität

Bei identischen Inputs muss der Build byte-identische fachliche JSON-Inhalte erzeugen. Zeitstempel, absolute Pfade, zufällige IDs und maschinenspezifische Werte gehören nicht in den kanonischen Payload. Falls Build-Zeitinformationen benötigt werden, liegen sie getrennt und fließen nicht in den fachlichen Digest ein.

JSON wird vor Hashing kanonisiert, beispielsweise nach RFC 8785. `integrity.json` enthält SHA-256-Digests für Manifest, Shards, Runtime-Chunks und Assets. Eine Seite pinnt die URL beziehungsweise Catalog-ID, `catalogVersion` und den erwarteten Digest.

### § 10.6 Unveränderlichkeit und Wartung

Ein publizierter Katalogpfad ist immutable. `latest` darf als bequemer, veränderlicher Zeiger existieren, darf aber niemals von einer produktiven Page-Version als alleinige Referenz verwendet werden.

Wartung erfolgt auf drei Wegen:

1. kompatibler neuer Katalog, auf den eine Seite bewusst aktualisiert wird,
2. Reader-Adapter, der ein älteres Major-Format weiterhin versteht,
3. explizites Migrationstool, das ein altes Artefakt in ein neues überführt und dabei einen prüfbaren Bericht erzeugt.

Alte Artefakte werden nicht in place umgeschrieben. CI hält mindestens einen Golden-Katalog jeder unterstützten Major-Version und prüft, dass aktuelle Reader ihn weiterhin laden, anzeigen und validieren können. Die Support-Matrix und Deprecation-Fristen werden dokumentiert.

### § 10.7 Umgang mit Runtime-only-Inhalten

Funktionen werden niemals als Source-Strings in JSON serialisiert oder von einem AI-Consumer evaluiert. Der Export enthält stattdessen eine strukturierte Markierung:

```json
{
  "availability": "runtime-only",
  "capability": "example.apply",
  "runtimeRef": "runtime/example-7b9d.js",
  "portable": false,
  "reason": "Uses component-specific setup code"
}
```

Eine vollständig offline arbeitende KI weiß dadurch, dass sie diese Funktion nicht ausführen kann, kann aber weiterhin deklarative Alternativen und Einschränkungen berücksichtigen.

## § 11 Direkte AI-Interaktion als spätere Ausbaustufe

### § 11.1 Tool-Oberfläche

Eine Bridge kann die gemeinsame Runtime später in wenige grobe Tools projizieren, beispielsweise:

- `list_components`
- `get_component`
- `inspect_page`
- `inspect_instance`
- `begin_draft`
- `apply_operations`
- `validate_draft`
- `export_draft`
- `commit_draft`
- `rollback_draft`

Die genaue Transporttechnik bleibt austauschbar. WebMCP ist ein relevanter entstehender Browser-Standard für JavaScript-basierte Tools auf Webseiten; MCP eignet sich als Adapter zu externen Assistenten. Beide dürfen nur Projektionen des TypeSpec-Contracts sein. Der Kern darf weder von einem experimentellen Browser-API-Namen noch von einer bestimmten Agent-Plattform abhängen.

### § 11.2 Human-in-the-loop

Eine KI darf standardmäßig lesen und Drafts verändern. Persistente, veröffentlichende oder anderweitig extern wirksame Operationen erfordern eine sichtbare Zusammenfassung, einen Diff und eine menschliche Bestätigung. Bestätigung gilt für die konkrete, validierte Operation auf einer konkreten Revision und nicht pauschal für spätere Änderungen.

Designer und KI sehen dieselbe Draft-History. Vorschläge der KI sind als solche gekennzeichnet, lassen sich einzeln annehmen, ändern oder verwerfen und sind vollständig undoable, solange noch kein externer Commit erfolgt ist.

### § 11.3 Sicherheitsgrenzen

Die spätere Bridge erfüllt mindestens folgende Anforderungen:

- Secure Context und Same-Origin-Grenzen,
- explizite Aktivierung pro Seite und Session,
- getrennte Scopes für read, preview und commit,
- Schema-Validierung aller Eingaben und Ergebnisse,
- keine beliebige DOM-, Script-, Netzwerk- oder Storage-Operation,
- minimale Parameter statt vorsorglich gesammelter Seiten- oder Kundendaten,
- Markierung untrusted Inhalte in Tool-Ergebnissen,
- Cancellation, Timeouts und begrenzte Payload-Größen,
- Audit-Log mit Akteur, Tool, Eingabe-Digest, Zielrevision, Ergebnis und Bestätigung,
- Konfliktprüfung über Revisionswerte,
- explizite Kennzeichnung folgenreicher Aktionen.

Tool-Beschreibungen und Seitentexte sind nicht automatisch vertrauenswürdig. Die Bridge trennt System-/Capability-Metadaten von editierbarem Kundeninhalt, damit Text auf der Seite keine zusätzlichen Berechtigungen oder Tool-Anweisungen erzeugen kann.

## § 12 Vite-Plugin und Build-Pipeline

Das MVP verwendet `@trunkjs/vite-plugin-typespec` im normalen Vite-Build. Es gibt keinen separaten TypeSpec-Build.

Das Plugin erhält:

- `entries`: eine Datei, mehrere einzelne Dateien oder ausdrücklich angegebene Globs für `*.typespec.ts`,
- `outDir`: das Zielverzeichnis für Manifest, optionale externe Module und spätere Snapshot-Artefakte,
- `bundle`: ob TypeSpecs Teil des aktuellen Vite-Builds werden; Standard ist `true`.

Konzeptionell:

```ts
import { defineConfig } from 'vite';
import { typeSpecPlugin } from '@trunkjs/vite-plugin-typespec';

export default defineConfig({
  plugins: [
    typeSpecPlugin({
      entries: [
        'src/typespec/app.typespec.ts',
        'packages/*/src/*.typespec.ts',
      ],
      outDir: 'dist/typespec',
      bundle: true,
    }),
  ],
});
```

Bei `bundle: true` gehören Registry, TypeSpec-Module und Development Viewer zum selben Vite-Build, werden aber als lazy Devtools-Chunk beziehungsweise weitere lazy Detail-Chunks ausgegeben. Sie werden nicht in den initialen Haupt-Chunk gezogen. Dort liegt nur der Bootstrap-Code von `<tj-typespec-dev-viewer>`, der den Devtools-Einstieg dynamisch importieren kann.

Bei `bundle: false` erzeugt das Plugin in `outDir` ein Manifest und separat ladbare ESM-Artefakte. Auch dieser Modus liest ausschließlich die angegebenen TypeSpec-Entries; `*.demo.ts`, Demo Viewer und implizite CEM-Discovery bleiben ausgeschlossen.

Das virtuelle Loader-Modul enthält nur den statischen Index und Dynamic Imports:

```ts
export const entries = {
  '@nextrap/ntl-2col': {
    tagName: 'ntl-2col',
    load: () => import('/src/components/ntl-2col/ntl-2col.typespec.ts'),
  },
};

export const loadDevelopmentTools = () =>
  import('virtual:typespec/devtools');
```

Das Plugin validiert doppelte IDs, unbekannte Referenzen und nicht auflösbare Entries. Ein Glob wird beim Build deterministisch aufgelöst; die sortierte Dateiliste fließt in Manifest und Digest ein. HMR invalidiert nur betroffene TypeSpec-Module und Registry-Einträge.

Demo-Viewer-Pakete bleiben vollständig außerhalb des Plugins. Eine mögliche spätere Bridge wird im Demo-Viewer-Projekt implementiert und konsumiert nur die öffentliche Core-API.



## § 13 Paketgrenzen

### § 13.1 `@trunkjs/typespec`

Das Paket besitzt vorerst zwei logisch getrennte Exportbereiche, damit Core und Visualisierung unabhängig entwickelt und später ohne Contract-Bruch in eigene Pakete verschoben werden können.

#### § 13.1.1 `@trunkjs/typespec/core`

- TypeScript-Contract und `defineTypeSpec()`
- interne Registry mit `register()`, `unregister()`, `has()`, `resolve()`, `observe()` und `invalidate()`
- UI-unabhängige Auflösung für konkrete `HTMLElement`-Instanzen
- gemeinsame Operationen zum Setzen von Class Groups, Modifier-/Feature-Klassen und CSS Custom Properties
- Constraint-Auswertung, Provenance und JSON-Schema-Typen
- keine Viewer-, Control-, Overlay- oder Demo-Viewer-Abhängigkeit

#### § 13.1.2 `@trunkjs/typespec/dev-viewer`

- leere Web Component `<tj-typespec-dev-viewer>` als Bootstrap und einziger TypeSpec-Bestandteil des Haupt-Chunks
- Aktivierung über `dev-mode="on|auto|off"`; Auto-Modus mit localhost-Erkennung und internem Session-Schalter unten links
- optionale Root-Auswahl über `selector`, selbstexkludierende DOM-Beobachtung und lazy Laden der eigentlichen Viewer-UI
- DOM-Indexierung, MutationObserver, nicht blockierender Hover-Rahmen und Öffnen-Schaltfläche

#### § 13.1.3 Lazy Viewer-UI

- lazy Oberfläche innerhalb beziehungsweise im Portalbesitz von `<tj-typespec-dev-viewer>`
- konfigurierbare Platzierung als `sidebar` oder `overlay`
- Darstellung und Live-Bearbeitung auf Basis der öffentlichen Core-API
- keine eigene Registry- oder Contract-Auflösung

### § 13.2 `@trunkjs/vite-plugin-typespec`

- Discovery und statische Analyse
- Discovery nur von TypeSpec-Modulen; CEM-Übernahme ausschließlich über explizites TypeSpec-Authoring
- virtuelle Registry und Lazy Chunks
- HMR
- Kompositionsauflösung
- deterministischer Katalog- und Schema-Export einschließlich atomarem Projekt-Snapshot
- Integritätsmanifest
- Checks und Diff-Grundlage

### § 13.3 Bestehende Pakete

- `@trunkjs/demo-viewer` bleibt eine eigenständige Browser-Runtime und Authoring-API für erweiterte Demos.
- `@trunkjs/vite-demo-viewer` bleibt unabhängig für Demo-Discovery und eigenständige Demo-Builds zuständig.
- Eine optionale Bridge wird vorzugsweise beim Demo Viewer angesiedelt und darf den öffentlichen TypeSpec-Index sowie minimale Beispiele konsumieren.
- Weder TypeSpec noch Demo Viewer setzen die Installation oder synchrone Weiterentwicklung des jeweils anderen voraus; der TypeSpec-Compiler besitzt keinerlei Demo-Discovery.

Weitere neue Pakete sind für den ersten Proof of Concept nicht vorgesehen. Ein separater Transportadapter für WebMCP oder MCP wird erst eingeführt, wenn die Runtime-API stabil genug ist.

## § 14 Interoperabilität und Standards

### § 14.1 Custom Elements Manifest

CEM bleibt eine geeignete vorgelagerte Grundlage für die öffentliche Web-Component-API, ist aber kein eigenständig entdeckter Compiler-Input. Eine `*.typespec.ts` kann ein CEM-Objekt ausdrücklich über einen typisierten Helfer importieren und um editorielle Semantik, Zustände, Constraints, Komposition, Beispiele, Recipes, Provenance und Operationsmetadaten ergänzen. Der Compiler lädt weiterhin ausschließlich TypeSpec-Module.

### § 14.2 JSON Schema

Value-, Operation-, Catalog- und Page-Schemas verwenden eine fest gepinnte JSON-Schema-Dialektversion. `$schema` und stabile `$id`-Werte sind Teil jedes veröffentlichten Schemas. Externe Schemas werden für langlebige Artefakte vendored oder über Digest-pinnte Referenzen eingebunden.

### § 14.3 WebMCP und MCP

WebMCP zeigt ein passendes Modell für auf einer Seite registrierte Tools mit strukturiertem Input-Schema und Sicherheitsannotationen, ist derzeit aber ein Community-Group-Entwurf und kein W3C-Standard. MCP bietet ein allgemeines Tool- und Ressourcenprotokoll. TypeSpec soll zu beiden abbildbar sein, aber keinen ihrer aktuellen Versionsstände als eigenes Dateiformat übernehmen.

### § 14.4 Kanonisches JSON

Für reproduzierbare Digests und Signaturen soll der Katalog eine dokumentierte Canonicalization verwenden. RFC 8785 ist der bevorzugte Ausgangspunkt, solange alle TypeSpec-Zahlen und Strings dessen interoperablem JSON-Profil entsprechen.

## § 15 Nicht-Ziele der ersten Version

- vollständiges CMS, Deployment oder Datenbank-Persistenz,
- Echtzeit-Kollaboration mehrerer Designer,
- beliebige visuelle Bearbeitung jedes DOM-Knotens,
- Ausführung von durch KI erzeugtem JavaScript,
- generischer Scraper für Komponenten ohne Contract,
- endgültige Standardisierung eines neuen CEM-Konkurrenten,
- direkte AI-Bridge im ersten Milestone,
- automatische Migration produktiver Seiten ohne Review.

## § 16 Risiken und Gegenmaßnahmen

### § 16.1 Zu großer Contract

Der Gesamtentwurf ist breiter als ein reiner API-Viewer. Deshalb startet die Implementierung mit einem vertikalen Schnitt und einem bewusst kleinen Operationssatz. Erweiterungspunkte werden versioniert, aber nicht vorab vollständig ausmodelliert.

### § 16.2 Unbeabsichtigte Kopplung mit dem Demo Viewer

TypeSpec und Demo Viewer sind beide noch in Entwicklung; eine direkte gegenseitige Abhängigkeit würde Änderungen, Releases und Zwischenstände unnötig koppeln. Deshalb besitzt TypeSpec nur einen minimalen, viewer-unabhängigen Beispiel-Contract für Beschreibung plus Markdown, HTML oder Code. Erweiterte Integration ist optional, wird als Bridge auf Seiten des Demo Viewers umgesetzt und darf weder TypeSpec-Builds noch einfache Demos voraussetzen oder blockieren.

### § 16.3 Imperative Escape-Hatches dominieren

Callbacks sind bequem, verhindern aber Offline-Validierung und portable AI-Nutzung. CI soll ausweisen, welcher Anteil eines Katalogs exportierbar ist. Kern-Controls, Constraints und Page-Komposition müssen im Proof of Concept vollständig deklarativ funktionieren.

### § 16.4 Scheinstabilität durch Versionen

Ein Versionsfeld allein garantiert keine Langlebigkeit. Der erste Release benötigt deshalb bereits Schema-Snapshot, Integritätsmanifest, deterministischen Build und mindestens einen Compatibility-Test, der einen alten Golden-Katalog mit dem aktuellen Reader lädt.

### § 16.5 Unsichere AI-Aktionen

Eine generische `execute(script)`- oder `setHTML`-Action ist ausgeschlossen. Die Bridge darf nur validierte Capabilities exponieren, die der Komponenten- oder Projekt-Contract ausdrücklich freigibt. Preview und Commit bleiben getrennt.

## § 17 Entscheidungen für das MVP

Für den ersten implementierbaren Schnitt gelten folgende Entscheidungen:

1. Nur ausdrücklich konfigurierte `*.typespec.ts`-Entries und Globs werden gelesen.
2. Das Vite-Plugin läuft im normalen Anwendungs-Build; `bundle: true` ist der Default.
3. Der Haupt-Chunk enthält nur den Bootstrap-Code des leeren `<tj-typespec-dev-viewer>`. Core, Registry, TypeSpecs und Viewer-UI bleiben bis zur Aktivierung lazy.
4. `dev-mode` ist `on`, `auto` oder `off`; ein fehlendes Attribut entspricht `off`.
5. Der Auto-Modus prüft ausschließlich `location.hostname === 'localhost'`, startet dort unabhängig von Schema und Port standardmäßig aktiv und speichert das Umschalten über einen internen Session-Schlüssel.
6. Die interne Registry unterstützt Registrieren, Abfragen, Auflösen, Beobachten und Invalidieren.
7. Der Element-Resolver liefert Verfügbarkeit, angewendete TypeSpecs, effektiven Contract und Revision.
8. Das Dev-Viewer-Element beobachtet standardmäßig `document.body` oder optional ein über `selector` gewähltes Root und markiert TypeSpec-fähige Elemente ohne deren Bedienung zu blockieren.
9. `<tj-typespec-dev-viewer>` ist zugleich Bootstrap und Host der lazy Viewer-UI; das Dokument wird nicht darin gewrappt und die UI-Platzierung bleibt konfigurierbar.
10. Das MVP bearbeitet Class Groups, Modifier beziehungsweise Feature-Klassen und CSS Custom Properties direkt am Element.
11. Nach jeder Änderung wird der effektive Contract erneut aufgelöst und die Viewer-UI aktualisiert.
12. Demo Viewer und `*.demo.ts` sind kein Bestandteil des MVPs oder der Compiler-Pipeline.
13. Weitergehende Draft-Sessions, Recipes, Snapshot-Distribution und AI-Adapter bleiben Zielarchitektur, sind aber keine Voraussetzung für die MVP-Abnahme.

## § 18 MVP-Ablauf

1. Ein Projekt konfiguriert TypeSpec-Entries, `outDir` und optional `bundle` im vorhandenen Vite-Build.
2. Der Build erzeugt den kleinen Bootstrap von `<tj-typespec-dev-viewer>` im Haupt-Chunk sowie lazy Core-/Registry-/Viewer-UI-Chunks.
3. Bei inaktivem Dev-Viewer-Element wird keiner dieser nachgelagerten Chunks angefordert.
4. Bei `dev-mode="on"` lädt das Element immer; bei `dev-mode="auto"` lädt es ausschließlich auf `localhost`, sofern die aktuelle Session nicht über den Umschalter deaktiviert wurde.
5. Registry und TypeSpec-Entries werden initialisiert; das Element indexiert `document.body` oder das über `selector` gewählte Root und ignoriert seine eigene UI vollständig.
6. Hover über ein unterstütztes Element zeigt einen nicht blockierenden Rahmen und eine Öffnen-Schaltfläche.
7. Die Schaltfläche öffnet die lazy Oberfläche desselben Dev-Viewer-Elements als Sidebar oder Overlay und übergibt das ausgewählte `HTMLElement` an den Core-Resolver.
8. Der Viewer rendert Beschreibung, Links, Class Groups, Modifier/Feature-Klassen und CSS-Variablen.
9. Eine Eingabe setzt oder entfernt Klassen beziehungsweise setzt eine CSS Custom Property am Ziel.
10. Der Core erhöht die Revision, löst den Contract erneut auf und liefert die nun wirksamen Felder und Constraints.
11. Der Viewer aktualisiert nur die geänderten Bereiche und bleibt mit dem realen Elementzustand synchron.



## § 19 Akzeptanzkriterien

### § 19.1 MVP Developer Tool

- Das Vite-Plugin akzeptiert einzelne Entry-Dateien, mehrere Dateien und deterministisch aufgelöste Globs.
- `outDir` ist verpflichtend; `bundle` ist optional und standardmäßig `true`.
- Ein normaler Vite-Build genügt für Anwendung und Development Tool.
- Bei `dev-mode="off"`, fehlendem Attribut oder deaktivierter Auto-Session wird außer dem Bootstrap des Dev-Viewer-Elements kein TypeSpec-Code geladen.
- `dev-mode="auto"` erkennt `localhost` unabhängig von Schema und Port, zeigt unten links einen Umschalter und merkt dessen Zustand intern in `sessionStorage`.
- Die Registry kann TypeSpecs registrieren und für ein `HTMLElement` Verfügbarkeit, Beiträge und effektiven Contract liefern.
- Neue und entfernte DOM-Teilbäume innerhalb von `document.body` oder dem optionalen Selector-Root werden erkannt, ohne bei jeder Mutation das gesamte Dokument erneut zu scannen.
- Der Hover-Rahmen verdeckt das Element nicht und verändert dessen Hit-Testing nicht.
- Das leere Dev-Viewer-Element benötigt kein Wrapper-Markup; Sidebar und Overlay sind austauschbare Darstellungen seiner lazy Oberfläche.
- Class Groups verhindern mehrere Klassen desselben Prefixes.
- Modifier/Feature-Klassen und CSS Custom Properties lassen sich live ändern.
- Nach jeder Mutation wird erneut aufgelöst; bedingt anwendbare TypeSpecs und Felder aktualisieren sich.



### § 19.2 Designer Experience

- Auswahl funktioniert per Pointer und Tastatur.
- Controls erklären Wert, Einheit, Herkunft und eine eventuelle Sperre.
- Viewport-, Container- und Komponentenstatus lassen sich reproduzierbar wechseln.
- Jede Vorschauänderung ist bis zum Commit rückgängig zu machen.
- Strukturänderungen respektieren Slot- und Kardinalitätsregeln.
- Export und erneutes Laden erzeugen denselben validierten Seitenzustand.

### § 19.3 AI- und Format-Readiness

- Catalog und Page Document sind ohne JavaScript-Ausführung schema-validierbar.
- Komponenten, Instanzen, Felder und Capabilities besitzen stabile IDs.
- Jede mutierende Operation beschreibt Schema, Wirkung, Reversibilität und Bestätigungsbedarf.
- Die Offline-Ausgabe einer KI kann vor Anwendung vollständig validiert und als Draft geöffnet werden.
- Eine spätere AI-Tool-Bridge benötigt keine zweite Komponenten- oder Operationsbeschreibung; eine Demo-Viewer-Bridge bleibt davon unabhängig und optional.

### § 19.4 Langlebigkeit

- Format-, Runtime-, Catalog- und Component-Version sind getrennt.
- Der Release ist selbstenthaltend, immutable und per SHA-256 prüfbar.
- Identische Inputs führen zu identischem fachlichem Output und Digest.
- Alte Golden-Kataloge bleiben durch Reader oder explizite Migration nutzbar.
- Produktive Seiten pinnen niemals nur einen veränderlichen `latest`-Zeiger.
- Ein vollständiger Snapshot lässt sich atomar erzeugen und in ein Kunden- oder Applikationsrepository einchecken.
- Ein eingecheckter Snapshot kann seinen historischen Komponentenstand ohne Zugriff auf die aktuell installierten Pakete darstellen.
- Snapshot-Manifest und Integritätsprüfung erkennen fehlende oder veränderte Komponentenmodule, Styles und Assets.

## § 20 Noch offene Produktentscheidungen

1. Wie heißt das Projekt endgültig?
2. Welcher Umfang des Inspectors und Composers gehört in das Kernpaket, welcher in eine projektspezifische Editor-Shell?
3. Welche Content- und Asset-Referenzen sind generisch genug für den Page-Contract?
4. Wie werden responsive Werte einheitlich modelliert: Breakpoint-Map, Condition-Liste oder Design-Token-Alias?
5. Welche Operationen darf ein Projekt zusätzlich registrieren, ohne Portabilität und Sicherheit zu verlieren?
6. Wie lange wird jede Major-Formatversion garantiert gelesen, und wo werden ihre Schemas dauerhaft veröffentlicht?
7. Soll der immutable Katalog als NPM-Artefakt, statisches Release-Archiv, OCI-Artefakt oder in mehreren Formen publiziert werden?
8. Welche projektspezifische Ebene übernimmt Commit, Persistenz, Authentifizierung und Publishing?
9. Welche WebMCP-/MCP-Adapter werden nach Stabilisierung der Runtime zuerst erprobt?

## § 21 Referenzen

- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest
- JSON Schema 2020-12: https://json-schema.org/specification
- JSON Canonicalization Scheme (RFC 8785): https://www.rfc-editor.org/rfc/rfc8785
- WebMCP Draft Community Group Report: https://webmachinelearning.github.io/webmcp/
- Model Context Protocol: https://modelcontextprotocol.io/specification/
- Open WC API Viewer Element: https://api-viewer.open-wc.org/
- Storybook Autodocs: https://storybook.js.org/docs/writing-docs/autodocs
- JetBrains Web-Types: https://github.com/JetBrains/web-types
