# @trunkjs/vite-demo-viewer

Vite-Plugin zum Auffinden und Anzeigen von Demo-Dateien in einem einfachen Demo-Viewer.

Die Browser-/Viewer-Runtime, `defineDemo(...)` und die Viewer-Typen kommen aus `@trunkjs/demo-viewer`; dieses Paket ist auf die Node-/Plugin-Seite fokussiert.

Dasselbe Plugin unterstützt den lokalen Serve-Modus und optional einen statischen Viewer-Build. Der aktuelle Vite-Befehl wählt den Modus; `build: true` aktiviert den eigenständigen Viewer bei `vite build`.

## Wichtig: Dateinamen der Demos

Demo-Dateien müssen auf **`.demo.ts`** enden.

```text
button.demo.ts
form-states.demo.ts
markdown.demo.ts
```

Standardmäßig scannt das Plugin nur `**/*.demo.ts`.

Die ältere Endung **`.tdemo.ts`** wird künftig nicht mehr automatisch berücksichtigt.

## Installation / Import

```ts
import { tjDemoViewerPlugin } from '@trunkjs/vite-demo-viewer';
import { defineDemo } from '@trunkjs/demo-viewer';
```

`defineDemo` wird bevorzugt aus `@trunkjs/demo-viewer` importiert. Für bestehende Projekte bleibt zusätzlich ein kompatibler `defineDemo`-Helper in `@trunkjs/vite-demo-viewer` erhalten.

## Vite konfigurieren

### Minimal

```ts
import { defineConfig } from 'vite';
import { tjDemoViewerPlugin } from '@trunkjs/vite-demo-viewer';

export default defineConfig({
  plugins: [tjDemoViewerPlugin()],
});
```

Damit werden standardmäßig alle `**/*.demo.ts` im aktuellen Workspace gescannt.

### Mit Optionen

```ts
import { defineConfig } from 'vite';
import { tjDemoViewerPlugin } from '@trunkjs/vite-demo-viewer';

export default defineConfig({
  plugins: [
    tjDemoViewerPlugin({
      include: ['packages/ui/demo/**/*.demo.ts'],
      route: '/__tdemo',
    }),
  ],
});
```

## Interne Aufteilung

- `@trunkjs/vite-demo-viewer`
  - Vite-Plugin / Node-Seite
- `@trunkjs/demo-viewer`
  - Browser-Runtime / Web Components / `defineDemo(...)` / Typen

## Plugin-Optionen

- `include?: string[]`
  - Glob-Patterns für Demo-Dateien
  - Default: `['**/*.demo.ts']`
- `exclude?: string[]`
  - Glob-Patterns, die vom Scan ausgeschlossen werden
  - Default: `['**/node_modules/**', '**/dist/**']`
- `root?: string`
  - Scan-Wurzel relativ zum Vite-Root
  - Default: Vite-Root
- `route?: string`
  - Exakte Route, unter der der Viewer im Dev-Server ausgeliefert wird
  - Default: `'/__tdemo'`
  - Nur `route: '/'` übernimmt die Root-Route
- `title?: string`
  - Titel der generierten Viewer-Seite
  - Default: `'TDemo Viewer'`
- `build?: boolean`
  - Erzeugt bei `vite build` einen eigenständigen statischen Viewer
  - Default: `false`, damit bestehende Library-Builds unverändert bleiben

## Wie definiert man Demos?

Es gibt zwei übliche Varianten.

### 1. Als Objekt mit `defineDemo(...)`

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Meine Demo',
  description: 'Kurze Beschreibung',
  html: '<p>Hallo Demo</p>',
});
```

### 2. Als `render(root)`-Demo

```ts
export function render(root: HTMLElement) {
  root.textContent = 'Hallo Demo';
}
```

Oder als Default-Export:

```ts
export default {
  title: 'Counter',
  render(root: HTMLElement) {
    root.textContent = 'Counter Demo';
  },
};
```

## `defineDemo` / `TDemoDefinition`

Wichtige Optionen einer Demo:

- `filename?: string`
  - wird normalerweise automatisch gesetzt
- `group?: string`
- `tags?: string[]`
- `title?: string`
- `description?: string`
- `html?: string`
  - statischer HTML-Inhalt
- `markdown?: string`
  - Markdown-Inhalt; wird über `@trunkjs/ast-markdown` gerendert
- `wrapper_html?: string`
  - Wrapper-HTML mit `{{content}}` als Platzhalter für `html` oder `markdown`
- `css?: string | 'default' | null | Array<string | 'default'>`
  - steuert die CSS-Injektion
- `controls_raw_html?: string`
  - zusätzliches HTML für den Controls-Bereich
- `controls?: TControlDefinition[]`
  - eingebaute Controls für Buttons, Inputs, Selects etc.
- `render?(root: HTMLElement)`
  - imperative Demo-Funktion

## CSS-Verhalten

Der Renderer unterstützt drei typische Fälle.

### Default-Style automatisch

Wenn `css` nicht gesetzt ist, wird automatisch das interne Default-Stylesheet verwendet.

```ts
export default defineDemo({
  title: 'Markdown Demo',
  markdown: '# Hallo',
});
```

### Komplett ohne Styles

```ts
export default defineDemo({
  css: null,
  html: '<p>Ganz ohne automatisch injizierte Styles</p>',
});
```

### Eigene Styles plus Default-Style

```ts
import style from './demo.scss?inline';

export default defineDemo({
  css: ['default', style],
  markdown: '# Demo mit eigenem Styling',
});
```

## Beispiele

### HTML mit externer SCSS-Datei

```ts
import { defineDemo } from '@trunkjs/demo-viewer';
import html from './demo.html?raw';
import styleUrl from './demo.scss?url';

export default defineDemo({
  title: 'HTML + SCSS',
  description: 'HTML-Datei mit externer Stylesheet-URL',
  html,
  css: styleUrl,
});
```

### HTML mit inline-SCSS

```ts
import { defineDemo } from '@trunkjs/demo-viewer';
import style from './demo.scss?inline';

export default defineDemo({
  title: 'Inline SCSS',
  css: ['default', style],
  html: '<div class="box">Hallo</div>',
});
```

### Markdown-Demo

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Markdown Demo',
  description: 'Wird mit ast-markdown gerendert',
  markdown: `# Hallo

- Punkt 1
- Punkt 2

[Link](https://example.com)`,
});
```

### Markdown mit Wrapper

```ts
import { defineDemo } from '@trunkjs/demo-viewer';
import style from './article.scss?inline';

export default defineDemo({
  title: 'Markdown im Wrapper',
  css: ['default', style],
  wrapper_html: '<article class="article">{{content}}</article>',
  markdown: `## Inhalt

Text im Wrapper.`,
});
```

### Interaktive Demo mit `render(root)`

```ts
export default {
  title: 'Counter',
  description: 'Interaktive Demo',
  render(root: HTMLElement) {
    let count = 0;

    const value = document.createElement('output');
    const button = document.createElement('button');
    button.textContent = '+1';

    const update = () => {
      value.textContent = String(count);
    };

    button.addEventListener('click', () => {
      count += 1;
      update();
    });

    update();
    root.append(value, button);
  },
};
```

### Controls definieren

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Demo mit Controls',
  html: '<p>Öffne den Controls-Bereich unten.</p>',
  controls: [
    {
      label: 'Klick mich',
      element: 'button',
      onclick: () => console.log('geklickt'),
    },
    {
      label: 'Auswahl',
      element: 'select',
      selectOptions: ['A', 'B', 'C'],
      onchange: (event) => console.log((event.target as HTMLSelectElement).value),
    },
  ],
});
```

### Eigene Controls als HTML

```ts
import { defineDemo } from '@trunkjs/demo-viewer';

export default defineDemo({
  title: 'Custom Controls',
  html: '<p>Mit eigenem Controls-Markup</p>',
  controls_raw_html: `
    <button onclick="console.log('custom')">Custom Button</button>
  `,
});
```

## Statischer Viewer-Build

Der Build wird über dasselbe Plugin aktiviert:

```ts
import { defineConfig } from 'vite';
import { tjDemoViewerPlugin } from '@trunkjs/vite-demo-viewer';

export default defineConfig({
  base: '/mein-repository/',
  plugins: [
    tjDemoViewerPlugin({
      root: '..',
      include: ['packages/*/demo/**/*.demo.ts'],
      route: '/',
      title: 'Component demos',
      build: true,
    }),
  ],
  build: {
    outDir: '../dist/docs',
  },
});
```

`vite build` erzeugt die gebundelten Assets und eine passende `index.html`. Es wird keine handgeschriebene HTML-Datei benötigt.

### GitHub Pages

Für eine Projektseite muss `base` dem Repository-Pfad entsprechen, zum Beispiel `'/mein-repository/'`. Die Demo-Navigation bleibt innerhalb der Seite hash-basiert:

```text
https://organisation.github.io/mein-repository/#/demo/packages/button/demo/default.demo.ts
```

Der Hash wird nicht an GitHub Pages gesendet. Direkte Links und Neuladen funktionieren deshalb ohne SPA-Rewrite oder `404.html`-Workaround.

## Hinweise

- Der Viewer rendert über `<tj-demo-viewer>` und nutzt intern `<tj-demo-viewer-nav>`.
- `demo.markdown` wird im Renderer per `MarkdownDocument` in DOM umgewandelt.
- Das Default-Stylesheet des Renderers kommt aus `@trunkjs/demo-viewer` und nutzt intern ein `codestyle()`-Mixin.
- Aufgeklappte Navigationsknoten werden im `sessionStorage` gespeichert.
