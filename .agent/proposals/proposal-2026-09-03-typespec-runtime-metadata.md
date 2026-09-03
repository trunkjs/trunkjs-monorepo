# Proposal: TypeSpec – ein langlebiger Interaktions-Contract für Web Components

Status: Entwurf
Arbeitstitel: TypeSpec

## Kurzfassung

TrunkJS soll seine Web Components einmal beschreiben und diese Beschreibung für vier zusammenhängende Aufgaben nutzen:

1. Entwickler erstellen Komponenten und ausführbare Beispiele mit guter TypeScript-Unterstützung, sofortigem Feedback und möglichst wenig doppelter Pflege.
2. Designer wählen Komponenten direkt auf einer laufenden Kundenseite aus, verändern sie in einer sicheren Entwurfssitzung, reagieren auf Zustände und stellen daraus Seitenabschnitte zusammen.
3. KI-Systeme können zunächst aus einem vollständig serialisierbaren Katalog gültige Seitenentwürfe vorbereiten.
4. Später können KI-Assistenten über dieselben typisierten Operationen mit der laufenden Seite zusammenarbeiten, die auch das Designer-Werkzeug nutzt.

TypeSpec ist damit nicht nur ein Dokumentationsformat. Es ist der versionierte Contract zwischen Komponenten-Quellcode, Demos, Build-Werkzeug, visueller Bearbeitung und maschineller Interaktion.

Die TypeScript-Authoring-Quelle darf komfortable Runtime-Helfer enthalten. Der Build erzeugt daraus jedoch zusätzlich einen deterministischen, validierbaren und unveränderlichen JSON-Katalog. Eine veröffentlichte Katalogversion wird nie überschrieben. Wartung erzeugt eine neue Version; alte Seiten bleiben auf ihre bisherige Version und deren Integritäts-Hash festgelegt. So können bereits kompilierte Kundenseiten über Jahre reproduzierbar bleiben, während Compiler, Viewer und Komponenten weiterentwickelt werden.

`TypeSpec` bleibt ein Arbeitstitel. Microsoft verwendet den Namen bereits für seine API-Beschreibungssprache; vor Veröffentlichung muss ein eindeutiger Name gewählt werden.

## Leitprinzipien

### Eine Quelle, mehrere Projektionen

Öffentliche Komponenten-API, Beispiele und manuelle Zusatzmetadaten sollen nicht parallel in mehreren Formaten gepflegt werden. Der Compiler setzt den effektiven Contract aus bestehenden Quellen zusammen:

- Custom Elements Manifest (CEM) für Attributes, Properties, Events, Slots, CSS Parts und CSS Custom Properties,
- bestehende `*.demo.ts`-Dateien und `defineDemo()` für ausführbare Beispiele,
- eine kompakte `*.typespec.ts` für Designer-Controls, Kompositionsregeln, deklarative Constraints, Aktionen und ergänzende Beschreibungen.

Aus dieser Authoring-Schicht entstehen verschiedene Projektionen: Runtime-Registry, Designer-UI, statischer Katalog, AI-Kontext und später Tool-Definitionen. Keine Projektion wird zur zweiten handgepflegten Quelle.

### Menschen und KI verwenden dieselbe Engine

Viewer, Designer-Werkzeug und spätere KI-Bridges dürfen den DOM nicht jeweils auf eigene Art verändern. Alle Änderungen laufen durch eine gemeinsame, typisierte Command-Engine. Dadurch gelten dieselben Constraints, Berechtigungen, Transaktionen, Undo-Regeln und Validierungen unabhängig davon, ob ein Mensch klickt oder ein Assistent eine Operation anfragt.

### Entwurf vor Wirkung

Lesen, Vorschau und dauerhafte Änderung sind getrennte Fähigkeiten. Bearbeitungen finden standardmäßig in einer reversiblen Draft-Session statt. Eine Vorschau darf die sichtbare Seite verändern, aber noch keine externe oder persistente Wirkung auslösen. Erst ein expliziter Commit übernimmt den validierten Entwurf. Für irreversible oder extern wirksame Aktionen ist zusätzlich eine Bestätigung erforderlich.

### Deklarativ zuerst, Runtime als Escape-Hatch

Alles, was Constraints, Controls, Beispiele und Operationen beschreibt, soll bevorzugt serialisierbar sein. Deklarative Regeln können im Build geprüft, in JSON exportiert, von Designern verstanden und von KI-Systemen sicher verwendet werden. Callbacks bleiben möglich, müssen aber explizit als `runtimeOnly` gelten und erhalten keine stillschweigende maschinelle Ausführbarkeit.

### Unveränderliche Releases statt eingefrorener Toolchains

Eine über Jahre stabile Seite benötigt keinen für immer unveränderten Compiler. Sie benötigt einen unveränderlichen, selbstbeschreibenden Release-Artefakt mit festem Schema, eindeutigen Versionen, Integritätswerten und getesteten Readern beziehungsweise Migrationen. Neue Builds ergänzen alte Artefakte, sie ersetzen sie nicht.

## Nutzer und zentrale Abläufe

### Komponentenentwickler

Ein Entwickler implementiert eine Komponente, lässt die technisch ableitbare API als CEM erzeugen, ergänzt nur die nicht ableitbaren Designer- und Kompositionsinformationen und verwendet dieselben Demos zur manuellen Prüfung, Dokumentation und Katalogerzeugung.

Der typische Ablauf soll sein:

1. Komponente und `*.demo.ts` anlegen oder ändern.
2. `*.typespec.ts` nur um semantische Angaben ergänzen, die nicht aus Code oder Demo ableitbar sind.
3. Im Vite-Dev-Server Komponente, Controls, Constraints und Export per HMR prüfen.
4. Mit `typespec check` verständliche, quellbezogene Diagnosen erhalten.
5. Mit `typespec diff` erkennen, ob sich der veröffentlichte Contract kompatibel oder brechend verändert.
6. Einen deterministischen Katalog bauen und in CI gegen Schema, Beispiele und Golden Files prüfen.

### Demo- und Beispielautoren

Das vorhandene `@trunkjs/demo-viewer` bleibt die Authoring-Oberfläche für ausführbare Beispiele. TypeSpec ersetzt `defineDemo()` und dessen Controls nicht, sondern erweitert sie um stabile Identitäten und maschinenlesbare Zustände.

Eine Demo soll optional angeben können:

- eine stabile `id` und die betrachtete Komponente,
- einen deklarativen Ausgangszustand,
- editierbare Parameter als JSON Schema plus UI-Hinweise,
- relevante Viewport-, Container-, Theme-, Locale- oder Datenzustände,
- erwartete Events oder sichtbare Zustandsübergänge,
- eine Reset-Strategie,
- ob sie vollständig exportierbar oder teilweise `runtimeOnly` ist.

Bestehende `render(root)`, `afterRender(env)` und `env.controls` bleiben nutzbar. Der Compiler übernimmt exportierbare Demo-Metadaten und markiert imperative Teile sichtbar als Runtime-only. Eine Beispielautorin muss dieselben Controls nicht noch einmal in der TypeSpec definieren.

### Designer in Kundensitzungen

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

### KI-gestützte Vorbereitung und Assistenz

In der ersten Stufe erhält eine KI den statischen Katalog, ein Page Document und die zugehörigen JSON Schemas. Sie kann daraus einen Entwurf oder eine Folge deklarativer Operationen erzeugen. Diese Ausgabe wird ohne JavaScript-Ausführung validiert und kann anschließend von einem Menschen im Designer-Werkzeug geöffnet werden.

In einer späteren Stufe exponiert die laufende Seite dieselben Lese- und Draft-Operationen als Tools. Die KI inspiziert damit die aktuelle Seite, schlägt Änderungen vor, wendet sie in einer Vorschau an und lässt sie durch den Menschen bestätigen. Sie steuert nicht den sichtbaren Inspector fern und führt kein beliebiges DOM-Scripting aus.

## Authoring-Contract

### Dateiaufteilung

Eine Komponente kann ihre TypeSpec neben Implementierung und Demos ablegen:

```text
nt2-two-col/
  nt2-two-col.ts
  nt2-two-col.css
  nt2-two-col.typespec.ts
  demo/
    default.demo.ts
    responsive.demo.ts
    empty.demo.ts
```

Die Zuordnung erfolgt über stabile Component- und Example-IDs, nicht allein über Dateipfade. Pfade bleiben Provenance und Diagnosehilfe, dürfen aber nicht die langlebige Identität eines veröffentlichten Eintrags sein.

### TypeScript-DX

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

### Ableitung statt Doppelpflege

Der Compiler führt Informationen anhand stabiler IDs zusammen:

1. CEM liefert die technisch beobachtbare Komponenten-API.
2. `*.typespec.ts` ergänzt Titel, semantische Beschreibungen, Wertebereiche, Designer-UI, Komposition, Constraints und Actions.
3. `*.demo.ts` liefert ausführbare Szenarien und deren inspectable Quelltext.
4. Projekt- oder Theme-TypeSpecs ergänzen oder überschreiben Einträge explizit.

Widerspricht eine manuelle Angabe der ableitbaren API, meldet der Build einen Fehler oder verlangt einen expliziten Override mit Begründung. Stilles Last-write-wins ist nicht zulässig.

### Diagnostik und Tooling

Die Mindest-DX umfasst:

- `typespec check` für Schema-, Referenz-, Constraint- und Exportprüfung,
- `typespec build` für Runtime-Registry und statischen Katalog,
- `typespec diff <alt> <neu>` mit Einordnung in kompatibel, potenziell brechend und brechend,
- Quellpfad, Zeile, Component-ID und JSON Pointer in jeder Diagnose,
- HMR für geänderte Specs und Demos ohne vollständigen Reload,
- eine Inspector-Ansicht für den effektiven, komponierten Contract und seine Provenance,
- Golden-Tests, die Byte-Stabilität und die Lesbarkeit älterer Kataloge prüfen.

Die Befehlsnamen sind konzeptionell; sie können als Nx-Targets und über das Vite-Plugin angeboten werden.

## Komponenten-, Zustands- und Control-Modell

### Komponentenoberfläche

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

### Werte-Schema und UI-Hinweise

Jedes editierbare Feld besitzt ein serialisierbares `valueSchema`, vorzugsweise JSON Schema 2020-12, und optional ein `ui`-Objekt. Das Schema definiert, was gültig ist; UI-Hinweise definieren nur, wie ein menschlicher Editor einen Wert komfortabel anbietet. Eine KI darf sich auf das Schema verlassen, nicht auf die Darstellung eines Sliders oder Pickers.

UI-Hinweise können Control-Typ, Einheit, Schrittweite, Gruppierung, Reihenfolge, Hilfe, Vorschaubild oder responsive Eingabe vorschlagen. Unbekannte UI-Hinweise dürfen von Readern ignoriert werden, ohne die Datenvalidierung zu verändern.

### Deklarative Constraints

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

### Reaktive Kontexte

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

## Beispiele und Szenarien

### Trennung von Showcase, Zustand und Ablauf

Ein Beispiel soll kenntlich machen, welchem Zweck es dient:

- `showcase`: visuelle Variante oder Kundendarstellung,
- `state`: definierter Komponenten- oder Datenzustand,
- `scenario`: reproduzierbare Interaktionsfolge mit erwarteten Ergebnissen,
- `recipe`: wiederverwendbarer Komponentenbaum als Startpunkt für einen Seitenabschnitt.

Diese Klassifikation hilft Entwicklern bei Tests, Designern bei der Variantenwahl und KI-Systemen bei der Auswahl eines passenden Ausgangspunkts.

### Deklarativer Szenario-Kern

Wo möglich, beschreibt ein Szenario Ausgangszustand, Parameter, Operationen und Erwartungen als Daten:

```ts
export default defineDemo({
  id: '@trunkjs/components/nt2-two-col/examples/responsive',
  title: 'Responsive Reihenfolge',
  subject: '@trunkjs/components/nt2-two-col',
  kind: 'scenario',

  initial: {
    attributes: { mode: 'editorial' },
    tokens: { gap: '2rem' },
    viewport: { width: 1280, height: 800 },
  },

  parameters: {
    reverse: {
      valueSchema: { type: 'boolean' },
      ui: { control: 'checkbox' },
    },
  },

  steps: [
    { do: 'set', path: 'modifier.reverse', valueFrom: 'reverse' },
    { expect: 'state', path: 'modifier.reverse', equalsFrom: 'reverse' },
  ],

  render(root) {
    // Bestehendes Demo-Authoring bleibt möglich.
  },
});
```

Der Compiler kann den deklarativen Kern exportieren. Imperatives Setup, Custom Renderer und `afterRender()` werden als gebundener Runtime-Chunk referenziert und nicht als vermeintlich portable JSON-Funktion serialisiert.

### Reset und Isolation

Jede interaktive Demo oder Recipe muss zuverlässig auf ihren Ausgangszustand zurückkehren können. Der bevorzugte Weg ist, den deklarativen Zustand auf eine neue isolierte Instanz anzuwenden. Imperative Demos müssen eine Cleanup-/Reset-Garantie erfüllen. Beispiele dürfen weder globale Dokumentzustände noch andere Demo-Instanzen unbemerkt verändern.

## Komposition und Provenance

### Explizite Komposition

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

### Provenance pro Feld

Jeder effektive Eintrag behält mindestens:

- Source-ID und Source-Version,
- ursprünglichen Paketnamen,
- Quelldatei und optional Quellposition,
- angewendete Overrides oder Patches,
- Digest des Ursprungsartefakts.

Der Inspector kann damit erklären, woher ein Control, Token, Constraint oder Beispiel stammt. Der statische Export ermöglicht dieselbe Nachvollziehbarkeit ohne Zugriff auf den Quellcode.

## Designer Runtime

### Auswahl und Inspektion

Der Launcher wird einmal in die Seite integriert. Er nutzt einen kleinen Index, um TypeSpec-fähige Elemente zu erkennen, ohne sämtliche Detail-Chunks zu laden. Auswahl muss per Pointer, Tastatur und Elementbaum möglich sein und auch Shadow DOM, dynamisch eingefügte Elemente und eingebettete Vorschau-Frames berücksichtigen, soweit dieselbe Origin und Berechtigung dies erlauben.

Highlighting und Overlays dürfen Layout, Events und Accessibility Tree der Kundenseite nicht unbeabsichtigt verändern. Der Inspector lädt erst nach Auswahl die effektive TypeSpec der konkreten Instanz.

### Inspector und Composer

Der Inspector erzeugt Controls aus `valueSchema`, UI-Hinweisen und aktuellem Constraint-Ergebnis. Er zeigt mindestens:

- aktuellen, Default- und geänderten Wert,
- Herkunft und Beschreibung,
- Gültigkeit einschließlich Begründung,
- responsive oder zustandsabhängige Werte,
- ausgelöste Events und betroffene Abhängigkeiten,
- verfügbare Beispiele und Recipes,
- die resultierenden Operationen beziehungsweise den Diff.

Der Composer arbeitet auf derselben Engine und ergänzt strukturverändernde Operationen. Slots definieren, welche Komponenten eingefügt werden dürfen und wie viele. Recipes liefern valide Ausgangsbäume. Freies HTML oder beliebige Script-Fragmente sind keine regulären Composer-Eingaben.

### Draft-Session und History

Eine Draft-Session besitzt eine ID, die zugrunde liegende Katalog-ID, eine Page-Revision und eine geordnete History typisierter Operationen. Unterstützt werden mindestens:

- `set` und `unset` für editierbare Werte,
- `insert`, `move`, `duplicate` und `remove` für freigegebene Strukturen,
- `invoke` für explizit erlaubte, nicht beliebige Komponenten-Actions,
- Gruppierung mehrerer Operationen zu einer atomaren Transaktion,
- Undo, Redo, Reset, Validate, Export und Commit.

Jede Operation enthält Zielreferenz, erwartete Revision und validierbare Eingaben. Bei einer veralteten Revision wird nicht still überschrieben; die Runtime liefert einen Konflikt mit aktuellem Zustand. Preview-Operationen dürfen keine als extern oder irreversibel markierte Action ausführen.

### Page Document

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

## Gemeinsame Runtime- und Command-API

### Instanzreferenzen

Eine langlebige API darf keine CSS-Selektoren oder rohe `Element`-Objekte als externen Contract verwenden. Die Runtime vergibt opake, für die aktuelle Page-Session stabile `instanceId`-Werte. Jede Inspektion liefert außerdem `revision`, Component-ID und Catalog-Digest. Nach Reload dürfen IDs neu aufgelöst werden, sofern das Page Document keine projektseitig stabilen IDs bereitstellt.

### API-Schichten

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

### Capability-Beschreibungen

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

## Statischer Katalog und AI-Export

### Zwei getrennte Exporte

Der Build erzeugt zwei zueinander passende, aber getrennte Dokumentarten:

1. **Catalog**: verfügbare Komponenten, Werte, Constraints, Slots, Recipes, Beispiele und Operationen.
2. **Page Document**: eine konkrete, gegen genau einen Catalog validierte Zusammenstellung von Komponenten und Werten.

Damit kann eine KI offline einen Page-Entwurf vorbereiten, ohne eine laufende Webseite oder Runtime-Code auszuführen. Der Entwurf wird anschließend gegen Catalog und Page-Schema validiert.

### Katalogstruktur

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

`catalog.json` enthält nur Suchindex, Versionsinformationen, Capability-Übersicht und Verweise. Detaildaten und Runtime-Chunks werden erst bei Bedarf geladen. Alle internen Verweise sind relativ oder über stabile IDs auflösbar; das Artefakt funktioniert ohne Build-Service und ohne unversionierte Remote-Schemas.

### Versionsfelder

Mindestens folgende Versionen sind getrennt:

- `formatVersion`: SemVer des serialisierten TypeSpec-Formats,
- `runtimeApiVersion`: Version der Browser-/Command-API,
- `catalogVersion`: fachliche Release-Version dieses Katalogs,
- `componentVersion`: veröffentlichte Version des Ursprungspakets,
- `producer`: Name und Version des Compilers,
- `sourceRevision`: Commit oder Release-Referenz,
- `integrity`: Digest des kanonischen Inhalts.

Ein Reader darf nicht aus der Compiler-Version auf das Datenformat schließen. Für jedes Major-Format wird ein unveränderliches JSON Schema mit stabiler `$id` veröffentlicht.

### Determinismus und Integrität

Bei identischen Inputs muss der Build byte-identische fachliche JSON-Inhalte erzeugen. Zeitstempel, absolute Pfade, zufällige IDs und maschinenspezifische Werte gehören nicht in den kanonischen Payload. Falls Build-Zeitinformationen benötigt werden, liegen sie getrennt und fließen nicht in den fachlichen Digest ein.

JSON wird vor Hashing kanonisiert, beispielsweise nach RFC 8785. `integrity.json` enthält SHA-256-Digests für Manifest, Shards, Runtime-Chunks und Assets. Eine Seite pinnt die URL beziehungsweise Catalog-ID, `catalogVersion` und den erwarteten Digest.

### Unveränderlichkeit und Wartung

Ein publizierter Katalogpfad ist immutable. `latest` darf als bequemer, veränderlicher Zeiger existieren, darf aber niemals von einer produktiven Page-Version als alleinige Referenz verwendet werden.

Wartung erfolgt auf drei Wegen:

1. kompatibler neuer Katalog, auf den eine Seite bewusst aktualisiert wird,
2. Reader-Adapter, der ein älteres Major-Format weiterhin versteht,
3. explizites Migrationstool, das ein altes Artefakt in ein neues überführt und dabei einen prüfbaren Bericht erzeugt.

Alte Artefakte werden nicht in place umgeschrieben. CI hält mindestens einen Golden-Katalog jeder unterstützten Major-Version und prüft, dass aktuelle Reader ihn weiterhin laden, anzeigen und validieren können. Die Support-Matrix und Deprecation-Fristen werden dokumentiert.

### Umgang mit Runtime-only-Inhalten

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

## Direkte AI-Interaktion als spätere Ausbaustufe

### Tool-Oberfläche

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

### Human-in-the-loop

Eine KI darf standardmäßig lesen und Drafts verändern. Persistente, veröffentlichende oder anderweitig extern wirksame Operationen erfordern eine sichtbare Zusammenfassung, einen Diff und eine menschliche Bestätigung. Bestätigung gilt für die konkrete, validierte Operation auf einer konkreten Revision und nicht pauschal für spätere Änderungen.

Designer und KI sehen dieselbe Draft-History. Vorschläge der KI sind als solche gekennzeichnet, lassen sich einzeln annehmen, ändern oder verwerfen und sind vollständig undoable, solange noch kein externer Commit erfolgt ist.

### Sicherheitsgrenzen

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

## Vite-Plugin und Build-Pipeline

`@trunkjs/vite-plugin-typespec` übernimmt:

- Discovery von CEM, `*.typespec.ts` und `*.demo.ts`,
- einen kleinen statisch analysierbaren Index,
- ein virtuelles Runtime-Modul wie `virtual:typespec`,
- Dynamic Imports und Code Splitting,
- HMR mit granularer Invalidierung,
- Komposition, Constraint- und Referenzprüfung,
- CEM-Mapping und Provenance,
- Erzeugung von Catalog, Page- und Operations-Schemas,
- deterministische Canonicalization und Integritätsmanifest,
- Build-Diagnostik und Diff-Daten.

Konzeptionell:

```ts
import { defineConfig } from 'vite';
import { typeSpecPlugin } from '@trunkjs/vite-plugin-typespec';

export default defineConfig({
  plugins: [
    typeSpecPlugin({
      include: ['packages/*/src/**/*.typespec.ts'],
      demos: ['packages/*/demo/**/*.demo.ts'],
      cem: ['packages/*/custom-elements.json'],
      catalog: {
        outDir: 'dist/typespec-catalog',
        immutable: true,
      },
    }),
  ],
});
```

Das virtuelle Modul enthält nur den Index und Loader:

```ts
export const components = {
  '@trunkjs/components/nt2-two-col': {
    tagName: 'nt2-two-col',
    load: () => import('/src/components/nt2-two-col/nt2-two-col.typespec.ts'),
  },
};
```

Die vorhandenen Pakete `@trunkjs/demo-viewer` und `@trunkjs/vite-demo-viewer` bleiben für Demo-Authoring und den eigenständigen Demo-Build zuständig. Das TypeSpec-Plugin liest deren deklarative Metadaten oder teilt sich mit ihnen einen schmalen Contract; es baut keine zweite, inkompatible Demo-Welt.

## Paketgrenzen

### `@trunkjs/typespec`

- TypeScript-Contract und `defineTypeSpec()`
- Katalog- und Page-Reader
- Runtime-Registry und Instanzauflösung
- gemeinsame Command- und Draft-Engine
- Viewer, Launcher, Inspector und Composer-Bausteine
- Constraint-Auswertung und Provenance-Anzeige
- JSON-Schema-Typen und Validierungsresultate

### `@trunkjs/vite-plugin-typespec`

- Discovery und statische Analyse
- CEM- und Demo-Integration
- virtuelle Registry und Lazy Chunks
- HMR
- Kompositionsauflösung
- deterministischer Katalog- und Schema-Export
- Integritätsmanifest
- Checks und Diff-Grundlage

### Bestehende Pakete

- `@trunkjs/demo-viewer` bleibt die Browser-Runtime und Authoring-API für Demos.
- `@trunkjs/vite-demo-viewer` bleibt für Demo-Discovery und eigenständige Demo-Builds zuständig und kann den TypeSpec-Index integrieren.
- Bestehende Controls sollen mittelfristig denselben Feld- und Schema-Contract verwenden, damit Entwickler-Demo und Designer-Inspector konsistent sind.

Weitere neue Pakete sind für den ersten Proof of Concept nicht vorgesehen. Ein separater Transportadapter für WebMCP oder MCP wird erst eingeführt, wenn die Runtime-API stabil genug ist.

## Interoperabilität und Standards

### Custom Elements Manifest

CEM bleibt die primäre Grundlage für die öffentliche Web-Component-API. TypeSpec erweitert es um editorielle Semantik, Zustände, Constraints, Komposition, Beispiele, Recipes, Provenance und Operationsmetadaten. Ein reines CEM soll importierbar bleiben; TypeSpec-spezifische Daten dürfen bei einem CEM-Export als Erweiterung erhalten oder eindeutig getrennt werden.

### JSON Schema

Value-, Operation-, Catalog- und Page-Schemas verwenden eine fest gepinnte JSON-Schema-Dialektversion. `$schema` und stabile `$id`-Werte sind Teil jedes veröffentlichten Schemas. Externe Schemas werden für langlebige Artefakte vendored oder über Digest-pinnte Referenzen eingebunden.

### WebMCP und MCP

WebMCP zeigt ein passendes Modell für auf einer Seite registrierte Tools mit strukturiertem Input-Schema und Sicherheitsannotationen, ist derzeit aber ein Community-Group-Entwurf und kein W3C-Standard. MCP bietet ein allgemeines Tool- und Ressourcenprotokoll. TypeSpec soll zu beiden abbildbar sein, aber keinen ihrer aktuellen Versionsstände als eigenes Dateiformat übernehmen.

### Kanonisches JSON

Für reproduzierbare Digests und Signaturen soll der Katalog eine dokumentierte Canonicalization verwenden. RFC 8785 ist der bevorzugte Ausgangspunkt, solange alle TypeSpec-Zahlen und Strings dessen interoperablem JSON-Profil entsprechen.

## Nicht-Ziele der ersten Version

- vollständiges CMS, Deployment oder Datenbank-Persistenz,
- Echtzeit-Kollaboration mehrerer Designer,
- beliebige visuelle Bearbeitung jedes DOM-Knotens,
- Ausführung von durch KI erzeugtem JavaScript,
- generischer Scraper für Komponenten ohne Contract,
- endgültige Standardisierung eines neuen CEM-Konkurrenten,
- direkte AI-Bridge im ersten Milestone,
- automatische Migration produktiver Seiten ohne Review.

## Risiken und Gegenmaßnahmen

### Zu großer Contract

Der Gesamtentwurf ist breiter als ein reiner API-Viewer. Deshalb startet die Implementierung mit einem vertikalen Schnitt und einem bewusst kleinen Operationssatz. Erweiterungspunkte werden versioniert, aber nicht vorab vollständig ausmodelliert.

### Doppelung mit Demo Viewer

TypeSpec darf keine zweite Demo-Definition oder Control-Leiste etablieren. Der Proof of Concept muss ein vorhandenes `defineDemo()` einlesen und dieselbe Demo sowohl im Demo Viewer als auch im TypeSpec Inspector verwenden.

### Imperative Escape-Hatches dominieren

Callbacks sind bequem, verhindern aber Offline-Validierung und portable AI-Nutzung. CI soll ausweisen, welcher Anteil eines Katalogs exportierbar ist. Kern-Controls, Constraints und Page-Komposition müssen im Proof of Concept vollständig deklarativ funktionieren.

### Scheinstabilität durch Versionen

Ein Versionsfeld allein garantiert keine Langlebigkeit. Der erste Release benötigt deshalb bereits Schema-Snapshot, Integritätsmanifest, deterministischen Build und mindestens einen Compatibility-Test, der einen alten Golden-Katalog mit dem aktuellen Reader lädt.

### Unsichere AI-Aktionen

Eine generische `execute(script)`- oder `setHTML`-Action ist ausgeschlossen. Die Bridge darf nur validierte Capabilities exponieren, die der Komponenten- oder Projekt-Contract ausdrücklich freigibt. Preview und Commit bleiben getrennt.

## Entscheidungen für den Proof of Concept

Damit der erste Schnitt nicht an offenen Grundsatzfragen blockiert, gelten vorläufig folgende Entscheidungen:

1. CEM ist die Basis; TypeSpec ergänzt statt kopiert.
2. `*.typespec.ts` ist das Authoring-Format, JSON der veröffentlichte portable Contract.
3. `traits` und `patches` sind die vorläufigen Begriffe; Konflikte müssen explizit aufgelöst werden.
4. JSON Schema 2020-12 beschreibt Werte und Operationen.
5. Deklarative Constraints sind der Normalfall; `valid()` ist Runtime-only Escape-Hatch.
6. `defineDemo()` bleibt die einzige Demo-Authoring-API.
7. Alle Bearbeitungen laufen über Draft und typisierte Operationen.
8. Catalog und Page Document sind getrennte, jeweils versionierte Exporte.
9. Veröffentlichte Kataloge sind immutable und per Digest adressierbar.
10. Direkte AI-Integration wird als Adapter über dieselbe Runtime-API vorbereitet, aber nicht im ersten Milestone gebaut.

## Erster vertikaler Milestone

Der Proof of Concept verwendet eine reale TrunkJS-Komponente und zwei kombinierbare Theme-/Projektbeiträge. Er muss folgende Kette vollständig zeigen:

1. CEM, eine kompakte `*.typespec.ts` und mindestens zwei vorhandene `*.demo.ts` werden gemeinsam entdeckt.
2. Der Compiler erzeugt einen typisierten, effektiven Contract mit stabilen IDs und Provenance.
3. Mindestens ein Boolean-, Enum-, Length- und Content-Feld erscheint ohne doppelte Definition im Demo Viewer beziehungsweise Inspector.
4. Eine deklarative Constraint reagiert auf Instanzzustand und Viewport oder Containergröße und liefert eine verständliche Begründung.
5. Ein Designer wählt die Instanz aus, verändert Werte in einem Draft, nutzt Undo/Redo und exportiert ein gültiges Page Document.
6. Eine Recipe fügt einen erlaubten Kindknoten in einen typisierten Slot ein; eine ungültige Kindkomponente wird abgewiesen.
7. Derselbe Draft lässt sich als deklarative Operationsliste ohne laufende Seite validieren und erneut anwenden.
8. Der Build erzeugt Catalog-Schema, Page-Schema, lazy Component-Shards und Integritätsmanifest.
9. Zwei Builds aus identischen Inputs erzeugen denselben kanonischen Digest.
10. Der aktuelle Reader lädt einen eingecheckten Golden-Katalog der ersten Formatversion.
11. `typespec diff` erkennt mindestens das Entfernen eines Feldes, die Verengung eines Wertebereichs und eine neue optionale Capability.
12. Ein prototypischer Tool-Adapter kann aus den Capability-Beschreibungen Schemas für `inspect_instance`, `apply_operations` und `validate_draft` erzeugen, führt aber noch keine externe AI-Verbindung aus.

## Akzeptanzkriterien

### Developer Experience

- Eine Komponentenautorin muss technisch ableitbare CEM-Felder nicht in TypeSpec wiederholen.
- Fehler verweisen auf Datei, Zeile, stabile ID und betroffenen JSON-Pfad.
- Demo-Metadaten und Controls werden aus einer bestehenden `*.demo.ts` übernommen.
- HMR aktualisiert eine geänderte Spec oder Demo ohne kompletten Neuaufbau.
- Runtime-only-Inhalte sind im Buildbericht und Export eindeutig erkennbar.

### Designer Experience

- Auswahl funktioniert per Pointer und Tastatur.
- Controls erklären Wert, Einheit, Herkunft und eine eventuelle Sperre.
- Viewport-, Container- und Komponentenstatus lassen sich reproduzierbar wechseln.
- Jede Vorschauänderung ist bis zum Commit rückgängig zu machen.
- Strukturänderungen respektieren Slot- und Kardinalitätsregeln.
- Export und erneutes Laden erzeugen denselben validierten Seitenzustand.

### AI- und Format-Readiness

- Catalog und Page Document sind ohne JavaScript-Ausführung schema-validierbar.
- Komponenten, Instanzen, Felder und Capabilities besitzen stabile IDs.
- Jede mutierende Operation beschreibt Schema, Wirkung, Reversibilität und Bestätigungsbedarf.
- Die Offline-Ausgabe einer KI kann vor Anwendung vollständig validiert und als Draft geöffnet werden.
- Eine spätere Tool-Bridge benötigt keine zweite Komponenten- oder Operationsbeschreibung.

### Langlebigkeit

- Format-, Runtime-, Catalog- und Component-Version sind getrennt.
- Der Release ist selbstenthaltend, immutable und per SHA-256 prüfbar.
- Identische Inputs führen zu identischem fachlichem Output und Digest.
- Alte Golden-Kataloge bleiben durch Reader oder explizite Migration nutzbar.
- Produktive Seiten pinnen niemals nur einen veränderlichen `latest`-Zeiger.

## Noch offene Produktentscheidungen

1. Wie heißt das Projekt endgültig?
2. Welcher Umfang des Inspectors und Composers gehört in das Kernpaket, welcher in eine projektspezifische Editor-Shell?
3. Welche Content- und Asset-Referenzen sind generisch genug für den Page-Contract?
4. Wie werden responsive Werte einheitlich modelliert: Breakpoint-Map, Condition-Liste oder Design-Token-Alias?
5. Welche Operationen darf ein Projekt zusätzlich registrieren, ohne Portabilität und Sicherheit zu verlieren?
6. Wie lange wird jede Major-Formatversion garantiert gelesen, und wo werden ihre Schemas dauerhaft veröffentlicht?
7. Soll der immutable Katalog als NPM-Artefakt, statisches Release-Archiv, OCI-Artefakt oder in mehreren Formen publiziert werden?
8. Welche projektspezifische Ebene übernimmt Commit, Persistenz, Authentifizierung und Publishing?
9. Welche WebMCP-/MCP-Adapter werden nach Stabilisierung der Runtime zuerst erprobt?

## Referenzen

- Custom Elements Manifest: https://github.com/webcomponents/custom-elements-manifest
- JSON Schema 2020-12: https://json-schema.org/specification
- JSON Canonicalization Scheme (RFC 8785): https://www.rfc-editor.org/rfc/rfc8785
- WebMCP Draft Community Group Report: https://webmachinelearning.github.io/webmcp/
- Model Context Protocol: https://modelcontextprotocol.io/specification/
- Open WC API Viewer Element: https://api-viewer.open-wc.org/
- Storybook Autodocs: https://storybook.js.org/docs/writing-docs/autodocs
- JetBrains Web-Types: https://github.com/JetBrains/web-types
