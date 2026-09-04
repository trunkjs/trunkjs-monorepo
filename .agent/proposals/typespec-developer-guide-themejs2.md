# TypeSpec Developer Guide: Nextrap und Theme.js 2

| Datum | Benutzername | Kurzbeschreibung |
|---|---|---|
| 2026-09-03 | dermatthes | §§ 1–19: Erstanlage des TypeSpec Developer Guides. |
| 2026-09-04 | dermatthes | §§ 1–19: Demo Viewer vollständig getrennt, Compiler auf TypeSpec-TS beschränkt und die Default-Anwendungsoption zugunsten beobachteter Class Groups entfernt. |
| 2026-09-04 | dermatthes | §§ 1–19: TypeSpec-Core-API zum Auflösen und Beobachten der aktuell wirksamen Definitionen eines HTML-Elements ergänzt. |
| 2026-09-04 | dermatthes | §§ 1–19: MVP-Konfiguration, lazy Dev-Mode, Registry, DOM-Highlighting, konfigurierbaren Viewer und Live-Bearbeitung dokumentiert. |
| 2026-09-04 | dermatthes | § 4, § 15: localhost-Umschalter ohne Pflichtattribute sowie Abschalten von Observer, Highlighting und Development Viewer dokumentiert. |
| 2026-09-04 | dermatthes | § 4, § 15: Leeres Dev-Viewer-Element, Body-Default, optionale Selector-Begrenzung und Schutz vor Selbstbeobachtung ergänzt. |

> **Status: fiktive Zieldokumentation.** Dieses Dokument beschreibt eine bewusst konkrete, noch nicht implementierte API auf Basis des TypeSpec-Proposals. Paketnamen, Funktionsnamen, CLI-Befehle und Dateiformate sind als Zielbild zu verstehen und können sich vor der Implementierung ändern.

## § 1 Ziel

TypeSpec beschreibt die editierbare Oberfläche einer Web Component genau einmal und macht sie anschließend für Dokumentation, Demos, den visuellen Viewer, statische Kataloge und spätere KI-Werkzeuge nutzbar.

Für Nextrap und Theme.js 2 gilt dabei eine klare Eigentümerschaft:

- **Nextrap** besitzt den vollständigen, theme-unabhängigen Komponentenvertrag: Attributes, Properties, Events, Slots, Tokens, States, Styles und Modifier.
- **Theme.js 2** besitzt die theme-spezifischen Capabilities: verfügbare Komponenten, zusätzliche Style-Varianten, abweichende Defaults, Einschränkungen und theme-spezifische Beschreibungen.
- **Ein Projekt** darf den effektiven Vertrag anschließend bewusst einschränken oder überschreiben.

Ein Theme beginnt also nie mit einer leeren Komponentendefinition. Sobald es eine Nextrap-Komponente referenziert, erbt es deren gesamten Vertrag. Es beschreibt nur die Differenz.

## § 2 Das Modell in 60 Sekunden

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

## § 3 Installation

```bash
npm install @trunkjs/typespec
npm install -D @trunkjs/vite-plugin-typespec
```

Core und das Dev-Viewer-Bootstrap-Element mit lazy Oberfläche liegen für das MVP als getrennte Exports im Paket `@trunkjs/typespec`. Dadurch bleiben die Modulgrenzen klar, ohne bereits mehrere Pakete veröffentlichen zu müssen.

## § 4 MVP-Schnellstart

### § 4.1 TypeSpec-Entries in Vite konfigurieren

```ts
// vite.config.ts
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

`entries` akzeptiert eine Datei, mehrere Dateien oder explizite Globs. `outDir` ist das Ausgabeziel. `bundle` ist optional und standardmäßig `true`: TypeSpec gehört dann zum normalen Vite-Build, wird jedoch als lazy Devtools-Chunk erzeugt. Der Compiler liest ausschließlich die aufgelösten TypeSpec-Dateien.

### § 4.2 Leeres Dev-Viewer-Element einbinden

```ts
// src/main.ts
import '@trunkjs/typespec/dev-viewer';
```

```html
<body>
  <main id="content-pane">
    <!-- normale Anwendung; kein TypeSpec-Wrapper -->
  </main>

  <tj-typespec-dev-viewer
    dev-mode="auto"
    selector="#content-pane"
    viewer-placement="sidebar"
  ></tj-typespec-dev-viewer>
</body>
```

`<tj-typespec-dev-viewer>` bleibt leer und darf an beliebiger Stelle im `body` stehen. Die Anwendung wird nicht in das Element gewrappt. Ohne `selector` überwacht es `document.body`; mit `selector` nur das gewählte Element einschließlich seiner Nachfahren. Im Beispiel wird ausschließlich `#content-pane` inspiziert.

Ein ungültiger oder nicht auflösbarer Selector erzeugt eine sichtbare Diagnose und aktiviert keine Beobachtung. Das Element fällt in diesem Fall nicht still auf die gesamte Seite zurück.

Nur der Bootstrap dieser Web Component landet im initialen Chunk. `dev-mode` steuert das Nachladen:

| Wert | Verhalten |
|---|---|
| `on` | Core, Registry, TypeSpecs und Viewer-UI auf jedem Host lazy laden und aktivieren. |
| `auto` | Nur bei exakt `location.hostname === 'localhost'` verfügbar; unabhängig von `http`/`https` und Port. |
| `off` oder nicht gesetzt | Nichts nachladen und keine sichtbare UI erzeugen. |

Auf `localhost` zeigt `auto` unten links permanent einen kleinen Umschalter. Fehlt der interne Session-Wert, ist das Tool zunächst aktiv. Der Button kann es jederzeit aus- und wieder einschalten; der Zustand wird intern in `sessionStorage` gespeichert.

### § 4.3 Verhalten beim Ausschalten

Beim Ausschalten werden der `MutationObserver` getrennt, Hover-Rahmen und Auswahl entfernt und die Viewer-Oberfläche verborgen oder unmountet. Der localhost-Umschalter selbst bleibt sichtbar. Bereits importierte Module bleiben technisch im Browser, sind aber inaktiv; nach einem Reload verhindert der Session-Wert den Dynamic Import.

### § 4.4 Viewer-Platzierung konfigurieren

`viewer-placement="sidebar"` öffnet die lazy Oberfläche seitlich, `viewer-placement="overlay"` als schwebendes Fenster. Diese Darstellung ändert weder das leere Bootstrap-Element noch den beobachteten Root.

## § 5 TypeSpec-Core: Definitionen für ein Element auflösen

Die Auflösung ist unabhängig von jeder Visualisierung. Sie liegt vorerst im bestehenden Paket unter `@trunkjs/typespec/core` und kann später als eigenes Paket `@trunkjs/typespec-core` ausgegliedert werden. Der Core akzeptiert HTML-Elemente und liefert Daten; er rendert keine Controls, Panels oder Overlays.

### § 5.1 Container anlegen

Der Container bindet einen Katalog und den aktuellen Projektkontext. Er kann einmal pro Seite oder Dokument erzeugt und von beliebigen Clients verwendet werden:

```ts
import { createTypeSpecContainer } from '@trunkjs/typespec/core';
import catalog from 'virtual:typespec/catalog';

const typeSpecs = createTypeSpecContainer({
  catalog,
  context: {
    theme: '@leuffen/themejs2/osman',
    project: '@customer/website',
  },
});
```

### § 5.2 TypeSpecs registrieren

Das Vite-Loader-Modul registriert die konfigurierten Entries nach der Aktivierung automatisch. Tests, HMR und projektspezifische Integrationen können dieselbe Registry-API direkt verwenden:

```ts
const unregister = typeSpecs.registry.register(ntl2ColSpec);

typeSpecs.registry.has('@nextrap/ntl-2col');
typeSpecs.registry.list();

unregister();
```

Eine Registrierung ersetzt niemals still einen Eintrag mit derselben stabilen ID. HMR verwendet einen expliziten Replace-Vorgang und erhöht die Registry-Revision.

### § 5.3 Ein Element abfragen

`resolve(element)` beantwortet gleichzeitig, ob eine TypeSpec vorhanden ist, welche Definitionen aktuell gelten und wie der komponierte effektive Contract aussieht:

```ts
const element = document.querySelector('ntl-2col');

if (!(element instanceof HTMLElement)) {
  throw new Error('ntl-2col not found');
}

const resolution = await typeSpecs.resolve(element);

if (!resolution.available) {
  console.info('Für dieses Element liegt keine TypeSpec vor.');
} else {
  console.table(resolution.applied);
  renderControls(resolution.effective.editor);
}
```

Für schnelle Prüfungen ohne Laden aller Detail-Shards steht zusätzlich `has(element)` zur Verfügung. Das Ergebnis bedeutet nur, dass der Index mindestens einen Kandidaten kennt; für den vollständigen, kontextabhängigen Contract bleibt `resolve(element)` maßgeblich.

```ts
if (typeSpecs.has(element)) {
  const resolution = await typeSpecs.resolve(element);
}
```

### § 5.4 Rückgabeformat

Eine erfolgreiche Auflösung kann beispielsweise so aussehen:

```ts
{
  available: true,
  componentId: '@nextrap/ntl-2col',
  tagName: 'ntl-2col',
  revision: 17,

  applied: [
    {
      kind: 'component',
      id: '@nextrap/ntl-2col',
      version: '2.4.0',
      source: 'ntl-2col.typespec.ts',
    },
    {
      kind: 'theme',
      id: '@leuffen/themejs2/osman',
      version: '3.1.0',
      source: 'osman.theme.typespec.ts',
    },
    {
      kind: 'project',
      id: '@customer/website',
      version: '1.8.0',
      source: 'site.project.typespec.ts',
    },
  ],

  effective: {
    title: 'Zweispaltiges Layout',
    description: 'Ordnet Hauptinhalt und Seitenspalte responsiv an.',
    links: [
      { title: 'Komponenten-Dokumentation', href: '/docs/ntl-2col' },
    ],

    classGroups: {
      style: {
        prefix: 'style-',
        mode: 'single',
        active: 'default',
        activeClass: 'style-default',
        values: {
          default: { class: 'style-default', title: 'Standard' },
          hero: { class: 'style-hero', title: 'Hero' },
        },
      },
    },

    modifiers: {
      reverse: {
        active: false,
        class: 'reverse',
        title: 'Spalten umkehren',
        valueSchema: { type: 'boolean' },
      },
    },

    featureClasses: {
      withShadow: {
        active: false,
        class: 'with-shadow',
        title: 'Schatten',
        valueSchema: { type: 'boolean' },
      },
    },

    cssVariables: {
      gap: {
        property: '--ntl-2col-gap',
        value: '2rem',
        title: 'Spaltenabstand',
        valueSchema: { type: 'string' },
      },
    },

    editor: {
      groups: [
        {
          id: 'appearance',
          title: 'Darstellung',
          fields: ['classGroup.style', 'modifier.reverse'],
        },
      ],
    },

    constraints: [],
  },

  diagnostics: [],
}
```

Liegt kein Contract vor, bleibt das Ergebnis strukturell eindeutig:

```ts
{
  available: false,
  componentId: null,
  tagName: 'div',
  revision: 3,
  applied: [],
  effective: null,
  diagnostics: [],
}
```

`applied` enthält die gerade wirksamen Beiträge vor der Komposition; `effective` ist die zusammengeführte Sicht, aus der ein Client Controls und Optionen erzeugt. `revision` ändert sich monoton, sobald eine relevante Eingabe für dieses Element neu bewertet wurde.

### § 5.5 Dynamische Änderungen beobachten

Ein Client kann nach jeder relevanten Änderung selbst erneut `resolve(element)` aufrufen oder die deklarative Beobachtung verwenden:

```ts
const stop = typeSpecs.observe(element, async ({ previous, current, changedPaths }) => {
  if (!current.available) {
    clearControls();
    return;
  }

  updateControls({
    editor: current.effective.editor,
    values: current.effective,
    changedPaths,
    revision: current.revision,
  });
});

// Später:
stop();
```

Der Container beobachtet nur Abhängigkeiten, die in den anwendbaren TypeSpecs deklariert sind, etwa Attributes, Klassen, Custom States, Slots, Theme, Containergröße oder Viewport. Für Property- oder interne Zustände, die nicht über DOM oder deklarierte Events sichtbar werden, informiert die Komponente den Container ausdrücklich:

```ts
typeSpecs.invalidate(element, {
  reason: 'component-state-changed',
  paths: ['state.loading'],
});
```

Nach der Invalidierung löst der Container erneut auf, erhöht die Revision und benachrichtigt Beobachter nur bei einem fachlich geänderten Ergebnis.

### § 5.6 Nutzung durch einen Viewer

Ein Viewer oder eine Demo-Viewer-Bridge bleibt ein reiner Client. Er besitzt keine eigene TypeSpec-Auflösung:

```ts
const resolution = await typeSpecs.resolve(selectedElement);

if (resolution.available) {
  viewer.render({
    fields: resolution.effective.editor.groups,
    contract: resolution.effective,
    revision: resolution.revision,
  });
}
```

Bei jeder Benachrichtigung aus `observe()` rendert der Client nur die betroffenen Eingabefelder oder Optionen neu. Die Bridge gehört zum Demo-Viewer-Projekt; der TypeSpec-Core importiert weder Demo Viewer noch dessen Typen.

## § 6 Eine Nextrap-Komponente definieren

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

### § 6.1 Automatisch gesetztes `style-default` beobachten

Nextrap ergänzt über `SetDefaultStyleMixin` automatisch `style-default`, wenn keine andere `style-*`-Klasse vorhanden ist. TypeSpec bildet dieses Laufzeitverhalten nicht mit einer eigenen Default-Anwendungsoption nach. Viewer und Inspector lesen die tatsächlich am Element gesetzte Klasse und behandeln `style-default` deshalb genauso wie jede ausdrücklich gesetzte Klasse als aktiven Wert.

Die Class Group beschreibt nur die gegenseitige Ausschließlichkeit eines Prefixes: Bei `prefix: 'style-'` und `mode: 'single'` darf am Element höchstens eine Klasse mit diesem Prefix aktiv sein. Beim Wechsel ersetzt die Engine die vorhandene `style-*`-Klasse; ein Zustand mit beispielsweise `style-default style-hero` wird abgewiesen. Andere Klassen wie `reverse`, `with-shadow`, `without-shadow`, `size-lg` oder `with-bg-primary` bleiben unabhängige Modifier und können kombiniert werden, sofern keine Constraint dies verbietet.

## § 7 Was innerhalb der TypeSpec übernommen wird

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

### § 7.1 Eine abgeleitete Angabe bewusst überschreiben

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

## § 8 Viewer-unabhängige Beispiele definieren

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

## § 9 Ein Theme in Theme.js 2 definieren

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

### § 9.1 Theme-Contract

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

### § 9.2 Komponenten-Capability

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

## § 10 Reale Theme.js-2-Struktur als TypeSpec

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

## § 11 Komponenten und Capabilities unterscheiden sich pro Theme

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

## § 12 Geerbte Werte überschreiben

### § 12.1 Titel oder Default für ein Theme ändern

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

### § 12.2 Einen geerbten Modifier einschränken

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

### § 12.3 Einen geerbten Modifier anders darstellen

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

## § 13 Projekt-Overrides

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

## § 14 Constraints

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

## § 15 MVP Development Launcher und Viewer

### § 15.1 Beobachtungs-Root und Selbstexklusion

Nach Aktivierung läuft das leere `<tj-typespec-dev-viewer>` einmal mit einem `TreeWalker` über seinen Beobachtungs-Root. Ohne `selector` ist das `document.body`; mit `selector` wird nur das erste von `document.querySelector(selector)` gelieferte Element einschließlich seiner Nachfahren berücksichtigt. Das Dokument muss nicht innerhalb der Web Component liegen.

Ein `MutationObserver` verarbeitet danach nur hinzugefügte und entfernte Teilbäume innerhalb dieses Roots. Für jedes reguläre `HTMLElement` prüft der kleine Registry-Index `typeSpecs.has(element)`; Detail-TypeSpecs werden erst bei Auswahl aufgelöst.

Das Dev-Viewer-Element selbst, sein Shadow Root und sämtliche von ihm erzeugten UI-, Portal-, Rahmen- und Button-Knoten tragen interne Ownership-Marker und werden vor Traversierung, Hover-Prüfung und Mutation-Verarbeitung ausgeschlossen. Mutationen aus dem eigenen Rendern können deshalb keine neue Viewer-Aktualisierung auslösen.

Änderungen am inspizierten Zielelement werden dagegen verarbeitet. Core-Operationen tragen eine Revisions-ID; ihre Mutation Records werden bis zum Operationsabschluss gesammelt und führen anschließend zu genau einer erneuten Auflösung. Dadurch aktualisiert sich ein dynamischer Contract ohne rekursive Render-/Observer-Schleife.

Wird `selector` geändert, trennt das Element zuerst den bisherigen Observer, entfernt die aktuelle Auswahl und bindet anschließend den neuen Root. Ein ungültiger oder nicht gefundener Selector erzeugt eine Diagnose und beobachtet nichts. Shadow Roots werden nur berücksichtigt, wenn sie offen sind oder ausdrücklich registriert wurden; Cross-Origin-Iframes bleiben außerhalb des MVPs.

### § 15.2 Nicht blockierendes Hover-Highlight

Der Launcher zeichnet keinen gefüllten Layer über das Zielelement. Stattdessen positioniert er vier schmale Rahmensegmente an den Außenkanten des aktuellen `getBoundingClientRect()`. Die Segmente verwenden `pointer-events: none`, enthalten keinen Hintergrund und werden bei Scroll, Resize und Layoutänderungen nachgeführt. Das Element bleibt im Inneren vollständig anklickbar und editierbar.

Neben einer freien Außenkante erscheint eine kleine Öffnen-Schaltfläche. Nur diese Schaltfläche nimmt Pointer-Events an. Sie hält die Auswahl stabil, wenn der Pointer vom Element zum Button wechselt, und öffnet den Development Viewer mit dem ausgewählten Element.

### § 15.3 Viewer-UI des Bootstrap-Elements

```html
<tj-typespec-dev-viewer
  dev-mode="auto"
  selector="#content-pane"
  viewer-placement="sidebar"
></tj-typespec-dev-viewer>
```

Das leere Dev-Viewer-Element lädt seine Oberfläche erst nach Aktivierung und kann sie als `sidebar` oder `overlay` darstellen. Beim Ausschalten über den localhost-Umschalter wird nur die Oberfläche verborgen oder unmountet; das kleine Bootstrap-Element mit dem Umschalter bleibt bestehen.

Der Viewer zeigt im MVP:

- Titel, Beschreibung und Links,
- Class Groups als Radio-, Select- oder Optionsfeld; `mode: 'single'` verhindert mehrere aktive Klassen desselben Prefixes,
- Modifier und zusätzliche Feature-Klassen als Checkboxen oder Schalter,
- CSS Custom Properties mit ihrem aktuellen Wert und einem zum `valueSchema` passenden Eingabefeld,
- Provenance, aktive TypeSpec-Beiträge und Diagnosen.

### § 15.4 Werte live anwenden

Der Viewer verändert das Element nicht direkt, sondern verwendet Core-Operationen:

```ts
let resolution = await typeSpecs.resolve(element);

await typeSpecs.apply(element, {
  op: 'setClassGroup',
  group: 'style',
  value: 'hero',
  expectedRevision: resolution.revision,
});

await typeSpecs.apply(element, {
  op: 'setModifier',
  modifier: 'reverse',
  value: true,
  expectedRevision: resolution.revision + 1,
});

await typeSpecs.apply(element, {
  op: 'setCssVariable',
  variable: 'gap',
  value: '3rem',
  expectedRevision: resolution.revision + 2,
});

resolution = await typeSpecs.resolve(element);
viewer.render(resolution);
```

`setClassGroup` entfernt vor dem Setzen alle anderen Klassen des deklarierten Prefixes. `setModifier` beziehungsweise `setFeatureClass` setzt oder entfernt genau die freigegebene Klasse. `setCssVariable` validiert den Wert und schreibt die CSS Custom Property am Zielelement.

Nach jeder erfolgreichen Operation invalidiert der Core das Element, erhöht dessen Revision und löst die anwendbaren TypeSpecs erneut auf. Dadurch können sich Felder, Optionen und Constraints unmittelbar ändern. Ein über `observe()` verbundener Viewer erhält das neue Ergebnis automatisch und rendert nur die betroffenen Bereiche neu.



## § 16 Build und Validierung

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

## § 17 Empfohlene Migrationsreihenfolge

1. Eine repräsentative Nextrap-Komponente wählen, beispielsweise `ntl-2col`.
2. Eine `ntl-2col.typespec.ts` als einzigen Compiler-Einstieg anlegen.
3. CEM-Daten bei Bedarf ausdrücklich innerhalb dieser TypeSpec über einen typisierten Helfer übernehmen.
4. Nicht ableitbare Class Groups, Modifier, Slots, Constraints und minimale Beispiele direkt in der TypeSpec ergänzen.
5. Je eine Capability für Osman, Raven, Müller und ePraxis anlegen.
6. Die vorhandenen SCSS-Dateien `_style-*.scss`, `_with-*.scss` und einfache Modifier den TypeSpec-Einträgen zuordnen.
7. TypeSpec Viewer und HMR zunächst nur im Development-Modus einbinden.
8. Katalog, Capability-Matrix und Golden Files in CI erzeugen.
9. Erst nach dem vertikalen Proof weitere Komponenten paketweise migrieren.

## § 18 Gestaltungsregeln für eine einfache API

- **Ein Compiler-Einstieg:** Nur TypeSpec-Module werden entdeckt; ableitbare CEM-Daten werden ausdrücklich innerhalb der TypeSpec übernommen und Demo-Dateien bleiben außerhalb.
- **Komponente vor Theme:** Nextrap definiert Fähigkeiten vollständig; Themes beschreiben Deltas.
- **Vererbung ist der Default:** Ein Theme verliert keine Komponenten-Modifier durch bloßes Weglassen.
- **Entfernen ist explizit:** Einschränkungen benötigen `remove` und eine Begründung.
- **Ein Prefix-Wert zur Zeit:** Eine Class Group mit `prefix: 'style-'` verhindert mehrere gleichzeitig gesetzte `style-*`-Klassen.
- **Modifier bleiben kombinierbar:** `with-*`, `without-*`, Größen und funktionale Klassen sind unabhängige Felder.
- **Laufzeitklassen sind maßgeblich:** Der Viewer erkennt das automatisch gesetzte `style-default` direkt am Element; TypeSpec setzt es nicht erneut.
- **Quellen bleiben nachvollziehbar:** Jeder Wert behält Provenance bis in den statischen Katalog.
- **Eine Engine für alle Clients:** Viewer, CLI, Draft-Export und spätere KI-Adapter verwenden dieselben Operationen und Constraints.

## § 19 Offene Implementierungsentscheidungen

Vor der Implementierung müssen insbesondere diese Punkte im vertikalen Proof validiert werden:

- endgültiger Produktname, da `TypeSpec` bereits anderweitig belegt ist,
- exakte Paketgrenzen zwischen Compiler, Vite-Plugin, Runtime und Viewer,
- ob für sicherheits- oder barrierefreiheitskritische Capabilities zusätzlich ein optionaler Theme-Verifikationsstatus benötigt wird,
- wie SCSS-Dateinamen optional als Diagnosehilfe erkannt werden, ohne SCSS zur zweiten Metadatenquelle zu machen,
- wie implizite Defaults im Page Document repräsentiert werden,
- welche Override-Pfade als reine Präsentationsmetadaten ohne Breaking Change gelten,
- wie Theme-Previews und visuelle Golden Files versioniert werden.

Die in diesem Dokument gezeigte API priorisiert einen kurzen Happy Path, explizite Konfliktauflösung und eine klare Trennung zwischen Nextrap-Komponentenvertrag, Theme.js-2-Capability und Projekt-Policy.
