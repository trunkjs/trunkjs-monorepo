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

TypeSpec soll CEM deshalb nicht ersetzen, sondern dessen Begriffe und Struktur soweit sinnvoll übernehmen. Eigene Felder sind nur dort vorgesehen, wo TrunkJS zusätzliche Informationen benötigt, zum Beispiel Modifier-Klassen, genauere CSS-Werttypen oder ausführbare Beispiele.

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

## Beispiele und weiterführende Inhalte

Eine TypeSpec kann Beispiele und Links zu Beispielen enthalten. Der Viewer zeigt diese an und kann ein Beispiel auf Klick direkt auf die aktuell betrachtete Komponenteninstanz anwenden.

Das genaue Format ist noch festzulegen. Mindestens folgende Varianten sollen möglich sein:

- ein Callback, der die bestehende Elementinstanz erhält und sie verändert,
- ein Custom Renderer für Beispiele, die sich nicht sinnvoll als Mutation ausdrücken lassen,
- ein externer oder interner Link zu einem weiterführenden Beispiel.

Konzeptionell beispielsweise:

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

Beschreibende Inhalte sollen außerdem direkt als **Markdown** angegeben werden können. Markdown kann sowohl für allgemeine Dokumentation als auch für Beschreibungen von Beispielen verwendet werden. Der Viewer übernimmt das Rendern.

Callbacks und Custom Renderer machen TypeSpec bewusst zu einer TypeScript-basierten Runtime-Erweiterung über rein statische CEM-Daten hinaus. Das Format und das Lifecycle-Verhalten solcher Beispiele müssen vor der Implementierung noch definiert werden, insbesondere wie ein Beispiel zurückgesetzt oder durch ein anderes ersetzt wird.

## Vite-Plugin und Lazy Loading

Das Vite-Plugin sucht nach TypeSpec-Dateien und stellt sie über ein virtuelles Modul bereit. Die Detaildaten werden nicht direkt in die Registry eingebettet, sondern dynamisch importiert:

```ts
export const components = {
  'nt2-two-col': () =>
    import('/src/components/nt2-two-col/nt2-two-col.typespec.ts'),
}
```

Ein Consumer lädt die Daten erst bei Bedarf:

```ts
const definition = await components['nt2-two-col']()
```

Vite kann daraus asynchrone Chunks erzeugen. Damit bleiben die Detailinformationen aus dem initialen Bundle heraus.

Das Plugin soll die Registry als virtuelles Modul bereitstellen, beispielsweise:

```ts
import { components } from 'virtual:typespec'
```

Ein physisch generiertes Include-File ist zunächst nicht nötig. Optional kann ein kleiner, immer verfügbarer Index nur Tag-Name, Titel oder Kategorie enthalten, damit Suche und Navigation ohne Laden der Detaildaten möglich sind.

## Viewer

`@trunkjs/typespec` stellt eine kleine Web Component zur Anzeige der Metadaten bereit:

```html
<type-spec for="nt2-two-col"></type-spec>
```

Der Viewer lädt die TypeSpec der angeforderten Komponente erst, wenn sie benötigt wird. Neben API-Informationen rendert er Markdown, zeigt Beispiele und Beispiel-Links und kann ausgewählte Beispiele direkt auf die betrachtete Komponente anwenden. Er soll trotzdem kein eigenes Dokumentationssystem oder Storybook-Ersatz werden.

## Pakete

### `@trunkjs/typespec`

- TypeScript-Contract
- optional `defineTypeSpec()`
- Viewer-Web-Component
- Markdown-Rendering
- Ausführung und Darstellung von Beispielen

### `@trunkjs/vite-plugin-typespec`

- Discovery der TypeSpec-Dateien
- virtuelle Registry
- Dynamic Imports / Code Splitting
- HMR
- optional kleiner Komponentenindex

Weitere Pakete sind zunächst nicht vorgesehen.

## Interoperabilität

CEM ist das primäre Austauschformat. Später können bei Bedarf Import oder Export von `custom-elements.json` ergänzt werden. Adapter für andere Formate wie JetBrains Web-Types sind ebenfalls denkbar, gehören aber nicht zur ersten Version. Runtime-spezifische Inhalte wie Callbacks oder Custom Renderer bleiben TypeSpec-Erweiterungen und sind nicht Teil des CEM-Austauschs.

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
3. Welche Felder lassen sich direkt auf CEM abbilden und welche benötigen Erweiterungen?
4. Wie sieht der Contract für Beispiele, Callback und Custom Renderer genau aus?
5. Wie werden angewendete Beispiele ersetzt oder auf den Ausgangszustand zurückgesetzt?
6. Brauchen wir CEM-Import/-Export bereits in Version 1?
7. Welche Informationen gehören in einen kleinen globalen Index?

## Erster Schritt

Als Proof of Concept reicht eine reale TrunkJS-Komponente:

1. minimalen Contract inklusive Markdown und einem einfachen Beispiel definieren,
2. eine `*.typespec.ts` anlegen,
3. Discovery und `virtual:typespec` implementieren,
4. Lazy Chunking verifizieren,
5. minimalen Viewer mit Markdown und Beispiel-Anwendung bauen,
6. CEM-Mapping prüfen.

Danach können Contract, Naming und Paketgrenzen anhand einer funktionierenden Implementierung entschieden werden.
