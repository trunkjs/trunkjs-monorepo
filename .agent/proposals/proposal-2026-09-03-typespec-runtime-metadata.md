# Proposal: TypeSpec – Runtime-Metadaten für Web Components

Status: Entwurf  
Arbeitstitel: TypeSpec

## Ziel

TrunkJS soll Komponenten-Metadaten direkt in Demos und normalen Views anzeigen können, ohne dafür eine separate Dokumentationsanwendung zu benötigen und ohne die Metadaten aller Komponenten in das initiale Bundle zu laden.

Dafür soll es zunächst zwei Pakete geben:

- `@trunkjs/typespec`: Metadaten-Contract und Viewer-Web-Component.
- `@trunkjs/vite-plugin-typespec`: Discovery, virtuelles Modul, HMR und Lazy Loading über Vite.

`TypeSpec` ist nur ein Arbeitstitel. Microsoft verwendet den Namen bereits für seine API-Beschreibungssprache.

## Bestehende Standards

Der wichtigste Bezugspunkt ist das **Custom Elements Manifest (CEM)**. CEM beschreibt bereits große Teile der öffentlichen Web-Component-API, unter anderem Attributes, Properties, Events, Slots, CSS Custom Properties, CSS Parts und Custom States.

TypeSpec soll CEM deshalb nicht ersetzen, sondern dessen Begriffe und Struktur soweit sinnvoll übernehmen. Eigene Felder sind nur dort vorgesehen, wo TrunkJS zusätzliche Informationen benötigt, zum Beispiel Modifier-Klassen, genauere CSS-Werttypen, Herkunftsinformationen, kontextabhängige Validierung, Komposition, ausführbare Beispiele oder AI-spezifische Metadaten.

Open WCs **API Viewer Element** zeigt bereits, dass sich CEM-Daten für einen interaktiven Komponenten-Viewer eignen. Storybook Autodocs verfolgt ein ähnliches Ziel innerhalb eines größeren Dokumentationssystems. TypeSpec soll bewusst kleiner bleiben und direkt in bestehende Anwendungen eingebettet werden können.

Der ursprünglich diskutierte Dateiname `*.webtype.ts` sollte vermieden werden, da **JetBrains Web-Types** bereits ein etabliertes Metadatenformat ist.

## Komponenten-Metadaten

Eine Komponente kann optional eine TypeScript-Datei neben ihrer Implementierung besitzen:

```text
nt2-two-col/
  nt2-two-col.ts
  nt2-two-col.css
  nt2-two-col.typespec.ts
```

Beispiel:

```ts
export default defineTypeSpec({
  component: 'nt2-two-col',

  modifiers: {
    reverse: {
      class: 'nt2-two-col--reverse',
      description: 'Kehrt die visuelle Spaltenreihenfolge um',
    },
  },

  cssProperties: {
    '--nt2-two-col-gap': {
      type: 'length',
      description: 'Abstand zwischen den Spalten',
    },
  },
})
```

Der Contract soll insbesondere Attributes und Properties, Events, Slots, CSS Custom Properties, CSS Parts, Custom States, Modifier-Klassen sowie Beschreibungen und Typinformationen abbilden können. Wo CEM bereits ein passendes Modell besitzt, soll dieses übernommen werden.

## Kontextabhängige Validierung

Modifier und CSS Properties können abhängig vom aktuellen Zustand einer Komponenteninstanz gültig oder ungültig sein. Deshalb sollen beide optional einen `valid`-Callback besitzen, der das aktuell betrachtete Element erhält und zur Laufzeit entscheidet, ob die jeweilige Option in diesem Kontext verwendet werden darf.

```ts
modifiers: {
  compact: {
    class: 'nt2-two-col--compact',
    valid: (element) => !element.classList.contains('nt2-two-col--hero'),
  },
},
```

Der Callback erhält bewusst das Element selbst, damit Attribute, Properties, Klassen, Zustände oder andere aktuell wirksame Modifier ausgewertet werden können. Der Viewer soll den Status live auswerten und ungültige Optionen als aktuell nicht anwendbar kennzeichnen.

Als nächster Schritt soll eine kompakte deklarative Shortcut-Syntax für häufige Regeln geprüft werden. `valid(element)` bleibt dabei die allgemeine Escape-Hatch.

## Herkunft, Vererbung und Komposition

TypeSpecs müssen sowohl **vererbbar als auch komponierbar** sein. Eine Basiskomponente kann eine schmale TypeSpec bereitstellen, während Themes oder Projekte zusätzliche TypeSpecs beitragen.

`extends` beschreibt eine eindeutige Basisspezifikation. Zusätzlich sollen `traits` oder `mixins` mehrere unabhängige TypeSpecs zu einem Mashup zusammensetzen können. Darüber hinaus muss eine Komposition gezielt Beiträge ausschließen können, etwa über `exclude` oder `without`.

```ts
export default defineTypeSpec({
  component: 'nt2-two-col',

  extends: '@trunkjs/components/nt2-two-col',

  traits: [
    '@trunkjs/theme/layout',
    '@trunkjs/theme/editorial',
  ],

  without: [
    '@trunkjs/theme/layout:modifier.fullbleed',
  ],
})
```

Entscheidend ist die **Precedence**. Vorgeschlagen ist, dass die konkrete konsumierende TypeSpec die Zusammensetzung bestimmt. Der Vite-Bundler löst diese Komposition nur auf und leitet keine inhaltliche Priorität aus der Discovery-Reihenfolge ab.

```text
Basis (`extends`)
→ Traits in deklarierter Reihenfolge
→ lokale TypeSpec
→ explizite Ausschlüsse/Overrides
```

Jede geladene TypeSpec und möglichst auch jeder einzelne zusammengeführte Eintrag muss seine **Herkunft** behalten. Mindestens sollen Paket/Projekt und ursprüngliche Quelldatei bekannt sein. Diese Informationen kann das Vite-Plugin beim Discovery-Schritt automatisch ergänzen.

```ts
source: {
  package: '@trunkjs/theme-example',
  file: 'src/components/nt2-two-col/nt2-two-col.typespec.ts',
}
```

Der Viewer soll bei Klassen, CSS Properties, Beispielen und anderen Einträgen anzeigen können, aus welcher TypeSpec, welchem Paket und welcher Quelldatei sie stammen. Auch nach Komposition oder Override darf diese Provenance nicht verloren gehen.

## Beispiele und weiterführende Inhalte

Eine TypeSpec kann Beispiele und Links zu Beispielen enthalten. Der Viewer zeigt diese an und kann ein Beispiel auf Klick direkt auf die aktuell betrachtete Komponenteninstanz anwenden.

Mindestens folgende Varianten sollen möglich sein:

- Callback auf der bestehenden Elementinstanz,
- Custom Renderer,
- interner oder externer Link.

```ts
examples: [
  {
    title: 'Umgekehrte Spalten',
    description: 'Vertauscht die visuelle Reihenfolge.',
    apply: (element) => element.classList.add('nt2-two-col--reverse'),
  },
  {
    title: 'Komplexes Beispiel',
    render: () => /* Custom Renderer */,
  },
  {
    title: 'Vollständiges Demo',
    href: '/demos/two-col/advanced',
  },
]
```

Beschreibende Inhalte sollen außerdem direkt als **Markdown** angegeben werden können. Der Viewer übernimmt das Rendern.

## Serialisierbarer JSON-/AI-Export

Aus den TypeSpecs muss zusätzlich ein vollständig serialisierbares JSON-Dokument erzeugt werden können. Dieses Dokument soll insbesondere für AI-Consumer geeignet sein, damit ein Modell ohne Ausführung des Runtime-Codes erkennen kann, welche Elemente existieren und welche Attributes, Properties, Slots, Modifier, CSS Properties, Beispiele und Kombinationen verfügbar sind.

Der JSON-Export ist damit eine zweite Repräsentation derselben Metadaten:

```text
TypeScript-TypeSpec
├── Runtime-Modul mit Callbacks und Renderern
└── serialisierbarer JSON-/AI-Export
```

Die Runtime-TypeSpec darf weiterhin Callbacks wie `valid(element)`, `apply(element)` oder Custom Renderer enthalten. Solche Funktionen können jedoch nicht direkt in JSON übernommen werden. Der Export darf deshalb unvollständige Runtime-Logik nicht zum Fehler machen, sondern muss sie nachvollziehbar kennzeichnen.

Ein Eintrag könnte beispielsweise so exportiert werden:

```json
{
  "name": "compact",
  "class": "nt2-two-col--compact",
  "description": "Kompakte Darstellung",
  "validation": {
    "mode": "runtime",
    "serializable": false
  }
}
```

Wo eine Regel zusätzlich deklarativ beschrieben werden kann, soll sie im JSON erhalten bleiben:

```json
{
  "name": "compact",
  "validation": {
    "mode": "declarative",
    "withoutModifiers": ["hero"]
  }
}
```

Die geplante Shortcut-Syntax für Validierungen ist damit nicht nur Convenience für Autoren, sondern verbessert zugleich die Maschinenlesbarkeit. Ein Callback bleibt weiterhin zulässig, führt aber im JSON gegebenenfalls nur zu einer Kennzeichnung wie `runtimeOnly` oder `serializable: false`.

Dasselbe gilt für Beispiele. Titel, Beschreibung, Links und andere deklarative Metadaten werden exportiert; ein `apply`-Callback oder Custom Renderer wird lediglich als vorhandene Runtime-Funktion markiert. Der AI-Consumer kann dadurch erkennen, dass ein Beispiel existiert, auch wenn er dessen Ausführung nicht vollständig aus dem JSON rekonstruieren kann.

Der Export soll nach Auflösung von `extends`, Traits, Ausschlüssen und Overrides erzeugt werden können und weiterhin Herkunftsinformationen enthalten. Dadurch kann eine KI sowohl die effektive API einer Komponente als auch die Quelle einzelner Beiträge nachvollziehen.

Langfristig kann dieses JSON entweder ein eigenes TypeSpec-Schema besitzen oder soweit möglich auf CEM aufsetzen und nur TypeSpec-Erweiterungen ergänzen. Entscheidend ist zunächst, dass der Export deterministisch, versionierbar und ohne JavaScript-Ausführung konsumierbar ist.

## Vite-Plugin und Lazy Loading

Das Vite-Plugin sucht nach TypeSpec-Dateien und stellt sie über ein virtuelles Modul bereit. Die Detaildaten werden dynamisch importiert:

```ts
export const components = {
  'nt2-two-col': () =>
    import('/src/components/nt2-two-col/nt2-two-col.typespec.ts'),
}
```

Vite kann daraus asynchrone Chunks erzeugen. Das Plugin soll die Registry als virtuelles Modul bereitstellen, beispielsweise:

```ts
import { components } from 'virtual:typespec'
```

Der Bundler kennt beim Discovery-Schritt Paket und Dateipfad, ergänzt Source-Metadaten und löst die explizit deklarierte Komposition aus `extends`, `traits` und Ausschlüssen auf. Zusätzlich soll er aus der aufgelösten Struktur den serialisierbaren JSON-/AI-Export erzeugen können.

Optional kann ein kleiner, immer verfügbarer Index nur Tag-Name, Titel oder Kategorie enthalten.

## Viewer

`@trunkjs/typespec` stellt eine Web Component zur Anzeige der Metadaten bereit:

```html
<type-spec for="nt2-two-col"></type-spec>
```

Der Viewer lädt die TypeSpec erst bei Bedarf. Er rendert API-Informationen und Markdown, zeigt Beispiele und Beispiel-Links, kann Beispiele anwenden, wertet `valid(element)` live aus und zeigt die Herkunft einzelner Einträge an.

## Pakete

### `@trunkjs/typespec`

- TypeScript-Contract
- optional `defineTypeSpec()`
- Viewer-Web-Component
- Markdown-Rendering
- Beispiele
- Validierung
- Kompositions- und Provenance-Modell
- serialisierbares Exportmodell

### `@trunkjs/vite-plugin-typespec`

- Discovery
- virtuelle Registry
- Dynamic Imports / Code Splitting
- HMR
- automatische Source-Metadaten
- Auflösung von `extends`, Traits und Ausschlüssen
- JSON-/AI-Export
- optional kleiner Komponentenindex

Weitere Pakete sind zunächst nicht vorgesehen.

## Interoperabilität

CEM ist das primäre Austauschformat. Runtime-spezifische Inhalte wie `valid`-Callbacks, Beispiele, Traits, Ausschlüsse und Herkunftsmetadaten bleiben TypeSpec-Erweiterungen. Der JSON-/AI-Export soll diese Erweiterungen soweit möglich serialisierbar abbilden und nicht serialisierbare Teile explizit kennzeichnen.

## Naming

Bisherige Kandidaten:

- TypeSpec
- DynTypes
- DynaTypes
- TypePack

Bis zur Namensentscheidung verwenden wir `TypeSpec`, `@trunkjs/typespec` und `@trunkjs/vite-plugin-typespec` als Arbeitstitel.

## Offene Fragen

1. Wie soll das Projekt endgültig heißen?
2. Bleibt `*.typespec.ts` das Dateiformat?
3. Welche Felder lassen sich direkt auf CEM abbilden?
4. Welche Namen verwenden wir endgültig für `traits`/`mixins` und `exclude`/`without`?
5. Welche Konflikt- und Override-Regeln gelten bei der Komposition?
6. Darf ein Trait selbst wieder `extends` oder weitere Traits besitzen?
7. Wie granular können Ausschlüsse sein?
8. Welchen Rückgabewert hat `valid(element)` langfristig?
9. Welche Shortcut-Syntax soll häufige Validierungsregeln abdecken und zugleich gut serialisierbar sein?
10. Wie sieht der Contract für Beispiele und Custom Renderer genau aus?
11. Wie werden Beispiele zurückgesetzt?
12. Ist der AI-Export ein eigenes TypeSpec-JSON-Schema oder eine CEM-Erweiterung?
13. Wie werden nicht serialisierbare Runtime-Funktionen im JSON einheitlich gekennzeichnet?
14. Brauchen wir CEM-Import/-Export bereits in Version 1?

## Erster Schritt

Als Proof of Concept reichen eine Basiskomponente und zwei kombinierbare Erweiterungen:

1. minimalen Contract mit `extends`, Traits, Ausschlüssen, `valid(element)`, Herkunft, Markdown und Beispiel definieren,
2. Basis-TypeSpec und zwei Theme-/Trait-TypeSpecs anlegen,
3. deterministische Precedence und Ausschlüsse implementieren,
4. Provenance nach der Komposition prüfen,
5. serialisierbaren JSON-/AI-Export erzeugen und Runtime-only-Felder markieren,
6. Discovery, `virtual:typespec` und Lazy Chunking implementieren,
7. minimalen Viewer bauen,
8. CEM-Mapping prüfen.

Danach können Contract, Naming und Paketgrenzen anhand einer funktionierenden Implementierung entschieden werden.
