# TypeSpec Developer Guide: Nextrap und Theme.js 2

| Datum | Geändert von / im Auftrag von | Kurzbeschreibung |
|---|---|---|
| 2026-09-03 | dermatthes | Erstanlage des TypeSpec Developer Guides. |
| 2026-09-04 | ChatGPT im Auftrag von dermatthes | Demo Viewer vollständig getrennt, Compiler auf TypeSpec-TS beschränkt und die Default-Anwendungsoption zugunsten beobachteter Class Groups entfernt. |

> **Status: fiktive Zieldokumentation.** Dieses Dokument beschreibt eine bewusst konkrete, noch nicht implementierte API auf Basis des TypeSpec-Proposals. Paketnamen, Funktionsnamen, CLI-Befehle und Dateiformate sind als Zielbild zu verstehen und können sich vor der Implementierung ändern.

## Ziel

TypeSpec beschreibt die editierbare Oberfläche einer Web Component genau einmal und macht sie anschließend für Dokumentation, Demos, den visuellen Viewer, statische Kataloge und spätere KI-Werkzeuge nutzbar.

Für Nextrap und Theme.js 2 gilt dabei eine klare Eigentümerschaft:

- **Nextrap** besitzt den vollständigen, theme-unabhängigen Komponentenvertrag: Attributes, Properties, Events, Slots, Tokens, States, Styles und Modifier.
- **Theme.js 2** besitzt die theme-spezifischen Capabilities: verfügbare Komponenten, zusätzliche Style-Varianten, abweichende Defaults, Einschränkungen und theme-spezifische Beschreibungen.
- **Ein Projekt** darf den effektiven Vertrag anschließend bewusst einschränken oder überschreiben.

Ein Theme beginnt also nie mit einer leeren Komponentendefinition. Sobald es eine Nextrap-Komponente referenziert, erbt es deren gesamten Vertrag. Es beschreibt nur die Differenz.

## Das Modell in 60 Sekunden

```text
Custom Elements Manifest + Nextrap TypeSpec + Demos
                        ↓
             Nextrap-Komponentenvertrag
                        ↓
               Theme.js-2-Overlay
                        ↓
                 Projekt-Overlay
                        ↓
       effektiver Contract für Viewer und Build
```

Die Auflösung ist deterministisch:

1. Das Custom Elements Manifest liefert technisch ableitbare API-Daten.
2. Die Komponenten-TypeSpec ergänzt semantische und visuelle Informationen.
3. Demos liefern Beispiele, Controls und Szenarien.
4. Das Theme erbt den Komponentenvertrag und ergänzt oder überschreibt ihn.
5. Das Projekt kann den effektiven Vertrag explizit patchen.

Stilles Last-write-wins gibt es nicht. Ein widersprüchlicher Wert benötigt ein `override` mit `reason`; das Entfernen einer geerbten Fähigkeit benötigt ein `remove` mit `reason`.

## Installation

```bash
npm install -D @trunkjs/typespec @trunkjs/vite-typespec
npm install @trunkjs/typespec-viewer
```

Nextrap-Pakete und Theme.js 2 veröffentlichen ihre TypeSpecs zusammen mit dem jeweiligen Paket. Ein Consumer muss deshalb keine Metadaten kopieren.

## Schnellstart

### 1. TypeSpec in Vite aktivieren

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { typeSpecPlugin } from '@trunkjs/vite-typespec';

export default defineConfig({
  plugins: [
    typeSpecPlugin({
      sources: [
        '@nextrap/*',
        '@leuffen/themejs2/theme/osman',
        './src/**/*.typespec.ts',
      ],
      catalog: {
        outDir: 'dist/typespec',
        fileName: 'catalog.json',
      },
    }),
  ],
});
```

Das Plugin entdeckt ausschließlich TypeSpec-Module. Es scannt weder Custom Elements Manifests noch `*.demo.ts`-Dateien und bindet keine Demo-Viewer-Pakete ein. Benötigte CEM-Daten werden ausdrücklich innerhalb einer `*.typespec.ts` über einen typisierten Authoring-Helfer importiert. Im Development-Modus stellt das Plugin den effektiven Katalog als `virtual:typespec/catalog` bereit und aktualisiert nur TypeSpec-Module per HMR.

### 2. Viewer in einer Entwicklungsseite starten

```ts
// src/dev-tools.ts
if (import.meta.env.DEV) {
  const { installTypeSpecViewer } = await import('@trunkjs/typespec-viewer');

  installTypeSpecViewer({
    catalog: () => import('virtual:typespec/catalog'),
    theme: 'osman',
    mode: 'draft',
  });
}
```

Der Launcher wird einmal in die laufende Seite eingebunden. Danach können TypeSpec-fähige Elemente per Pointer, Tastatur oder Elementbaum ausgewählt werden. Änderungen laufen in einer reversiblen Draft-Session und verändern nicht unmittelbar persistente Projektdaten.

### 3. Viewer in eine Dokumentationsseite einbetten

```ts
import '@trunkjs/typespec-viewer/element';
```

```html
<tj-typespec-viewer
  catalog-url="/typespec/catalog.json"
  theme="osman"
  target="#component-preview"
></tj-typespec-viewer>

<main id="component-preview">
  <ntl-2col>
    <div>Inhalt</div>
    <aside slot="aside">Seitenspalte</aside>
  </ntl-2col>
</main>
```

Der eingebettete Viewer und der Launcher verwenden dieselbe Registry, dieselben Constraints und dieselbe Command-Engine.

## Eine Nextrap-Komponente definieren

Die TypeSpec liegt neben der Komponente. Technische Angaben, die bereits im Custom Elements Manifest stehen, werden nicht wiederholt.

```text
nextrap-layout/ntl-2col/
  custom-elements.json
  src/components/ntl-2col/ntl-2col.ts
  src/components/ntl-2col/ntl-2col.typespec.ts
```

```ts
// ntl-2col.typespec.ts
import { defineTypeSpec } from '@trunkjs/typespec';
import type { Ntl2ColElement } from './ntl-2col.js';

export const ntl2ColSpec = defineTypeSpec<Ntl2ColElement>({
  id: '@nextrap/ntl-2col',
  tagName: 'ntl-2col',
  title: 'Zweispaltiges Layout',
  description: 'Ordnet Hauptinhalt und Seitenspalte responsiv an.',

  classGroups: {
    style: {
      prefix: 'style-',
      mode: 'single',
      default: 'default',
      values: {
        default: {
          class: 'style-default',
          title: 'Standard',
        },
      },
    },
  },

  modifiers: {
    reverse: {
      class: 'reverse',
      title: 'Spalten umkehren',
      valueSchema: { type: 'boolean' },
    },
  },

  slots: {
    default: {
      title: 'Hauptinhalt',
      minItems: 1,
      accepts: ['@nextrap/content/*'],
    },
    aside: {
      title: 'Seitenspalte',
      maxItems: 1,
      accepts: ['@nextrap/content/*'],
    },
  },

  editor: {
    groups: [
      { id: 'appearance', title: 'Darstellung', fields: ['classGroup.style', 'modifier.reverse'] },
      { id: 'content', title: 'Inhalt', fields: ['slot.default', 'slot.aside'] },
    ],
  },
});
```

### Automatisch gesetztes `style-default` beobachten

Nextrap ergänzt über `SetDefaultStyleMixin` automatisch `style-default`, wenn keine andere `style-*`-Klasse vorhanden ist. TypeSpec bildet dieses Laufzeitverhalten nicht mit einer eigenen Default-Anwendungsoption nach. Viewer und Inspector lesen die tatsächlich am Element gesetzte Klasse und behandeln `style-default` deshalb genauso wie jede ausdrücklich gesetzte Klasse als aktiven Wert.

Die Class Group beschreibt nur die gegenseitige Ausschließlichkeit eines Prefixes: Bei `prefix: 'style-'` und `mode: 'single'` darf am Element höchstens eine Klasse mit diesem Prefix aktiv sein. Beim Wechsel ersetzt die Engine die vorhandene `style-*`-Klasse; ein Zustand mit beispielsweise `style-default style-hero` wird abgewiesen. Andere Klassen wie `reverse`, `with-shadow`, `without-shadow`, `size-lg` oder `with-bg-primary` bleiben unabhängige Modifier und können kombiniert werden, sofern keine Constraint dies verbietet.

## Was innerhalb der TypeSpec übernommen wird

Der Compiler liest nur TypeSpec-Module. Eine Komponentendefinition kann ihre technisch ableitbaren Angaben ausdrücklich innerhalb der `*.typespec.ts` aus einem CEM-Objekt übernehmen und ergänzt dort die nicht ableitbaren Daten.

| TypeSpec-Inhalt | Herkunft innerhalb des Moduls | Ergebnis |
|---|---|---|
| technische Komponenten-API | explizit importiertes CEM-Objekt über typisierten Authoring-Helfer | Tag Name, Attributes, Properties, Events, Slots, CSS Parts und CSS Custom Properties |
| manuelle TypeSpec-Angaben | direktes TypeSpec-Authoring | Semantik, Class Groups, Modifier, Kompositionsregeln, Constraints, Editor-Gruppierung |
| minimale Beispiele | direkt in TypeSpec definierte Beschreibung plus Markdown, HTML oder Code | viewer-unabhängige Dokumentation ohne Demo-Runtime |

Der effektive Vertrag kann im Development-Modus inspiziert werden:

```bash
npx typespec inspect @nextrap/ntl-2col --theme osman
```

Jedes Feld zeigt seine Provenance, zum Beispiel `CEM importiert durch ntl-2col.typespec.ts`, `ntl-2col.typespec.ts` oder `theme/osman/.../ntl-2col.theme.typespec.ts`. Demo-Dateien sind keine Provenance-Quelle, weil der Compiler sie nicht liest.

### Eine abgeleitete Angabe bewusst überschreiben

```ts
export const ntl2ColSpec = defineTypeSpec<Ntl2ColElement>({
  id: '@nextrap/ntl-2col',
  tagName: 'ntl-2col',

  overrides: [
    {
      path: '/slots/aside/maxItems',
      value: 1,
      reason: 'CEM beschreibt die Slot-Kardinalität nicht; der Composer erlaubt genau eine Seitenspalte.',
    },
  ],
});
```

Ein Override ohne Begründung ist ein Build-Fehler. Ein Tippfehler im Pfad oder ein Override, der keinen vorhandenen beziehungsweise abgeleiteten Wert trifft, ist ebenfalls ein Fehler.

## Viewer-unabhängige Beispiele definieren

Minimale Beispiele werden direkt in der TypeSpec abgelegt. Für die erste Version genügen eine Beschreibung sowie Markdown, HTML oder ein kurzer Code-Snippet:

```ts
export const ntl2ColSpec = defineTypeSpec<Ntl2ColElement>({
  id: '@nextrap/ntl-2col',
  tagName: 'ntl-2col',
  examples: [{
    id: '@nextrap/ntl-2col/examples/reverse',
    title: 'Umgekehrte Spalten',
    description: 'Zeigt die Seitenspalte vor dem Hauptinhalt.',
    content: { kind: 'html', source: '<ntl-2col class="reverse">...</ntl-2col>' },
  }],
});
```

Der TypeSpec-Compiler kennt keine `*.demo.ts`, keine Demo-Controls und keinen Demo-Viewer-Lebenszyklus. Interaktive Demos können unabhängig in einem anderen Projekt existieren, werden aber weder entdeckt noch in den TypeSpec-Katalog übernommen.

## Ein Theme in Theme.js 2 definieren

Jedes Theme erhält einen zentralen Theme-Contract und kleine, colocated Capability-Dateien für seine Komponenten.

```text
theme/osman/
  osman.theme.typespec.ts
  _theme.scss
  elements/
    ntl-2col/
      ntl-2col.scss
      ntl-2col.theme.typespec.ts
      _style-default.scss
      _reverse.scss
      _with-bg-primary.scss
```

### Theme-Contract

```ts
// theme/osman/osman.theme.typespec.ts
import { defineThemeSpec } from '@trunkjs/typespec';
import { ntl2Col } from './elements/ntl-2col/ntl-2col.theme.typespec.js';
import { ntlCardRow } from './elements/ntl-card-row/ntl-card-row.theme.typespec.js';
import { ntlHero } from './elements/ntl-hero/ntl-hero.theme.typespec.js';

export default defineThemeSpec({
  id: '@leuffen/themejs2/osman',
  name: 'osman',
  title: 'Osman',
  selector: '.theme-osman',
  capabilities: [ntl2Col, ntlCardRow, ntlHero],
});
```

Nur Komponenten in `capabilities` werden im Theme-Viewer angeboten. Dadurch kann Osman beispielsweise `ntl-hero` anbieten, während Raven diese Capability derzeit nicht besitzt.

### Komponenten-Capability

```ts
// theme/osman/elements/ntl-2col/ntl-2col.theme.typespec.ts
import { defineThemeCapability } from '@trunkjs/typespec';
import { ntl2ColSpec } from '@nextrap/ntl-2col/typespec';

export const ntl2Col = defineThemeCapability(ntl2ColSpec, {
  styles: {
    default: true,
  },

  modifiers: {
    withBgPrimary: {
      class: 'with-bg-primary',
      title: 'Primärer Hintergrund',
      description: 'Färbt den Abschnitt semantisch mit der Primärfarbe des Osman-Themes.',
      valueSchema: { type: 'boolean' },
    },
  },
});
```

`true` bedeutet: Die geerbte Definition wird unverändert verwendet. Objektwerte ergänzen eine neue Theme-Capability oder überschreiben ausdrücklich erlaubte Präsentationsmetadaten.

Alle geerbten Attributes, Slots, Tokens, Actions und Modifier bleiben automatisch erhalten und gelten als unterstützt. Osman muss `reverse` deshalb nicht neu definieren. Nur eine abweichende Darstellung, ein geänderter Default oder eine bewusste Einschränkung wird im Theme erneut erwähnt.

## Reale Theme.js-2-Struktur als TypeSpec

Die vorhandenen SCSS-Varianten lassen sich in diesem Modell direkt abbilden.

| Theme | Komponente | Style-Varianten | zusätzliche Modifier |
|---|---|---|---|
| Osman | `ntl-2col` | `default` | geerbtes `reverse`, zusätzlich `withBgPrimary` |
| Raven | `ntl-2col` | `default`, `form`, `card`, `hero` | theme-spezifisch ergänzbar |
| Müller | `ntl-2col` | `default`, `testimonial` | geerbte Nextrap-Modifier |
| ePraxis | `ntl-2col` | `default`, `featured` | geerbte Nextrap-Modifier |

Raven beschreibt seine Varianten beispielsweise so:

```ts
import { defineThemeCapability } from '@trunkjs/typespec';
import { ntl2ColSpec } from '@nextrap/ntl-2col/typespec';

export const ntl2Col = defineThemeCapability(ntl2ColSpec, {
  styles: {
    default: true,
    form: {
      class: 'style-form',
      title: 'Formular',
      preview: './previews/ntl-2col-form.webp',
    },
    card: {
      class: 'style-card',
      title: 'Karte',
    },
    hero: {
      class: 'style-hero',
      title: 'Hero',
    },
  },
});
```

Da alle Werte unter `styles` zur geerbten `style`-Class-Gruppe gehören, kann immer nur einer aktiv sein. Der Viewer rendert dafür automatisch ein Radio-, Select- oder Thumbnail-Control.

## Komponenten und Capabilities unterscheiden sich pro Theme

Der Theme-Contract ist gleichzeitig eine maschinenlesbare Capability-Matrix. Auf Basis der aktuellen Theme.js-2-Struktur könnte sie unter anderem so aussehen:

| Komponente | Osman | Raven | Müller | ePraxis |
|---|:---:|:---:|:---:|:---:|
| `nte-accordion` | ✓ | – | ✓ | – |
| `nte-input` | ✓ | – | – | – |
| `nte-navbar` | ✓ | ✓ | – | – |
| `nte-offcanvas` | ✓ | – | – | – |
| `ntl-2col` | ✓ | ✓ | ✓ | ✓ |
| `ntl-card-row` | ✓ | ✓ | ✓ | ✓ |
| `ntl-hero` | ✓ | – | ✓ | ✓ |

Die Matrix wird nicht separat gepflegt. Sie ist eine Projektion der importierten `capabilities` und kann vom Viewer oder von der Dokumentation generiert werden.

## Geerbte Werte überschreiben

### Titel oder Default für ein Theme ändern

Präsentationsmetadaten dürfen direkt mit `override` verändert werden:

```ts
export const ntl2Col = defineThemeCapability(ntl2ColSpec, {
  styles: {
    default: true,
    testimonial: {
      class: 'style-testimonial',
      title: 'Testimonial',
    },
  },

  override: {
    '/classGroups/style/default': {
      value: 'testimonial',
      reason: 'Müller verwendet Zweispalter überwiegend als Testimonial-Komposition.',
    },
  },
});
```

Ein vom Theme geänderter Default wird im Export explizit geschrieben. Er darf nicht auf implizitem Laufzeitverhalten beruhen, wenn Nextrap weiterhin nur `style-default` automatisch setzt.

### Einen geerbten Modifier einschränken

```ts
export const ntl2Col = defineThemeCapability(ntl2ColSpec, {
  remove: [
    {
      path: '/modifiers/reverse',
      reason: 'Die Hero-Komposition des Projekts besitzt eine feste semantische Bildreihenfolge.',
    },
  ],
});
```

`remove` löscht keine Nextrap-Definition. Es entfernt die Capability nur aus dem effektiven Contract dieses Themes beziehungsweise Projekts. Provenance und Begründung bleiben im Katalog sichtbar.

### Einen geerbten Modifier anders darstellen

```ts
export const ntl2Col = defineThemeCapability(ntl2ColSpec, {
  override: {
    '/modifiers/reverse/title': {
      value: 'Bild rechts anzeigen',
      reason: 'In dieser Theme-Komposition befindet sich im Aside-Slot immer das Bild.',
    },
  },
});
```

Die CSS-Klasse und Semantik des Modifiers bleiben unverändert; nur die kontextbezogene Beschriftung wechselt.

## Projekt-Overrides

Ein Consumer kann Theme-Capabilities weiter einschränken, ohne Theme.js 2 zu forken.

```ts
// src/site.typespec.ts
import { defineProjectSpec } from '@trunkjs/typespec';
import osman from '@leuffen/themejs2/theme/osman/typespec';

export default defineProjectSpec({
  id: '@customer/website',
  extends: osman,

  patches: [
    {
      op: 'remove',
      component: '@nextrap/ntl-2col',
      path: '/modifiers/withBgPrimary',
      reason: 'Primärfarbige Flächen sind in diesem Markenauftritt nicht freigegeben.',
    },
    {
      op: 'replace',
      component: '@nextrap/ntl-2col',
      path: '/slots/aside/maxItems',
      value: 1,
      reason: 'Der Content Builder unterstützt genau einen Aside-Block.',
    },
  ],
});
```

## Constraints

Capabilities können abhängig von Style, Modifier, Slot-Belegung oder Theme-Kontext verfügbar sein.

```ts
export const ntl2Col = defineThemeCapability(ntl2ColSpec, {
  styles: {
    default: true,
    hero: { class: 'style-hero', title: 'Hero' },
  },

  constraints: [
    {
      id: 'hero-needs-aside',
      when: { style: 'hero' },
      assert: { slot: 'aside', minItems: 1 },
      message: 'Die Hero-Variante benötigt ein Bild oder Medium im Aside-Slot.',
      severity: 'error',
    },
    {
      id: 'hero-fixed-order',
      when: { style: 'hero' },
      disable: ['modifier.reverse'],
      message: 'Die Hero-Variante besitzt eine feste Reihenfolge.',
      severity: 'info',
    },
  ],
});
```

Der Viewer erklärt gesperrte Controls mit derselben strukturierten Meldung, die auch CLI, CI und spätere KI-Werkzeuge erhalten.

## Viewer-Verhalten für Themes

Wird ein Element ausgewählt, löst der Viewer den Contract für die konkrete Kombination aus Komponente, Theme und Projekt auf:

1. Er erkennt das Element über `tagName` und stabile Component-ID.
2. Er ermittelt das aktive Theme über die konfigurierte Theme-ID beziehungsweise den Theme-Selector.
3. Er lädt nur die benötigte Komponenten-Capability.
4. Er zeigt den effektiven, geerbten Wert und dessen Provenance.
5. Jede Änderung erzeugt eine typisierte Operation in der Draft-Session.
6. Constraints werden vor der Vorschau und vor dem Export geprüft.

Beispieloperation:

```json
{
  "op": "set",
  "target": "page.hero.columns",
  "path": "classGroup.style",
  "value": "hero",
  "expectedRevision": 12
}
```

Die Engine übersetzt diese Operation in die konkrete DOM-Änderung, ersetzt dabei die bisherige `style-*`-Klasse und erhöht die Instanz-Revision. Viewer, Undo/Redo und spätere Tool-Adapter verwenden exakt dieselbe Operation.

## Build und Validierung

```bash
# Quellen, Referenzen, Overrides und exportierbare Daten prüfen
npx typespec check

# effektiven, deterministischen Katalog bauen
npx typespec build

# Theme-Capabilities anzeigen
npx typespec capabilities --theme osman

# effektiven Vertrag einer Komponente erklären
npx typespec inspect @nextrap/ntl-2col --theme raven --provenance

# Änderungen gegen einen veröffentlichten Katalog klassifizieren
npx typespec diff ./catalogs/1.2.0.json ./dist/typespec/catalog.json
```

Empfohlene CI-Schritte:

```json
{
  "scripts": {
    "typespec:check": "typespec check",
    "typespec:build": "typespec build",
    "typespec:diff": "typespec diff catalogs/current.json dist/typespec/catalog.json"
  }
}
```

Ein Build schlägt unter anderem fehl bei:

- unbekannten Component- oder Theme-IDs,
- unbekannten Override-Pfaden,
- zwei aktiven `style-*`-Werten,
- widersprüchlichen gleichrangigen Theme-Beiträgen,
- Zyklen in `extends` oder Traits,
- fehlenden Begründungen für `override` und `remove`,
- ungültigen Slot-Kardinalitäten,
- nicht serialisierbaren Angaben ohne `runtimeOnly`,
- Beispielen, die gegen den effektiven Theme-Contract verstoßen.

## Empfohlene Migrationsreihenfolge

1. Eine repräsentative Nextrap-Komponente wählen, beispielsweise `ntl-2col`.
2. Eine `ntl-2col.typespec.ts` als einzigen Compiler-Einstieg anlegen.
3. CEM-Daten bei Bedarf ausdrücklich innerhalb dieser TypeSpec über einen typisierten Helfer übernehmen.
4. Nicht ableitbare Class Groups, Modifier, Slots, Constraints und minimale Beispiele direkt in der TypeSpec ergänzen.
5. Je eine Capability für Osman, Raven, Müller und ePraxis anlegen.
6. Die vorhandenen SCSS-Dateien `_style-*.scss`, `_with-*.scss` und einfache Modifier den TypeSpec-Einträgen zuordnen.
7. TypeSpec Viewer und HMR zunächst nur im Development-Modus einbinden.
8. Katalog, Capability-Matrix und Golden Files in CI erzeugen.
9. Erst nach dem vertikalen Proof weitere Komponenten paketweise migrieren.

## Gestaltungsregeln für eine einfache API

- **Ein Compiler-Einstieg:** Nur TypeSpec-Module werden entdeckt; ableitbare CEM-Daten werden ausdrücklich innerhalb der TypeSpec übernommen und Demo-Dateien bleiben außerhalb.
- **Komponente vor Theme:** Nextrap definiert Fähigkeiten vollständig; Themes beschreiben Deltas.
- **Vererbung ist der Default:** Ein Theme verliert keine Komponenten-Modifier durch bloßes Weglassen.
- **Entfernen ist explizit:** Einschränkungen benötigen `remove` und eine Begründung.
- **Ein Prefix-Wert zur Zeit:** Eine Class Group mit `prefix: 'style-'` verhindert mehrere gleichzeitig gesetzte `style-*`-Klassen.
- **Modifier bleiben kombinierbar:** `with-*`, `without-*`, Größen und funktionale Klassen sind unabhängige Felder.
- **Laufzeitklassen sind maßgeblich:** Der Viewer erkennt das automatisch gesetzte `style-default` direkt am Element; TypeSpec setzt es nicht erneut.
- **Quellen bleiben nachvollziehbar:** Jeder Wert behält Provenance bis in den statischen Katalog.
- **Eine Engine für alle Clients:** Viewer, CLI, Draft-Export und spätere KI-Adapter verwenden dieselben Operationen und Constraints.

## Offene Implementierungsentscheidungen

Vor der Implementierung müssen insbesondere diese Punkte im vertikalen Proof validiert werden:

- endgültiger Produktname, da `TypeSpec` bereits anderweitig belegt ist,
- exakte Paketgrenzen zwischen Compiler, Vite-Plugin, Runtime und Viewer,
- ob für sicherheits- oder barrierefreiheitskritische Capabilities zusätzlich ein optionaler Theme-Verifikationsstatus benötigt wird,
- wie SCSS-Dateinamen optional als Diagnosehilfe erkannt werden, ohne SCSS zur zweiten Metadatenquelle zu machen,
- wie implizite Defaults im Page Document repräsentiert werden,
- welche Override-Pfade als reine Präsentationsmetadaten ohne Breaking Change gelten,
- wie Theme-Previews und visuelle Golden Files versioniert werden.

Die in diesem Dokument gezeigte API priorisiert einen kurzen Happy Path, explizite Konfliktauflösung und eine klare Trennung zwischen Nextrap-Komponentenvertrag, Theme.js-2-Capability und Projekt-Policy.
