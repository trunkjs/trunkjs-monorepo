# @trunkjs/vite-demo-viewer

Vite-Plugin zum Auffinden und Anzeigen von Demo-Dateien in einem einfachen Demo-Viewer.

Die Browser-/Viewer-Runtime, `defineDemo(...)` und die Viewer-Typen kommen aus `@trunkjs/demo-viewer-frontend`; dieses Paket ist auf die Node-/Plugin-Seite fokussiert.

Zusätzlich gibt es mit `viteDemoExporter` einen statischen Exporter, der einen deploybaren Viewer-Build erzeugt.

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
import { defineDemo } from '@trunkjs/demo-viewer-frontend';
```

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
- `@trunkjs/demo-viewer-frontend`
  - Browser-Runtime / Web Components / `defineDemo(...)` / Typen

## Plugin-Optionen

- `include?: string[]`
  - Glob-Patterns für Demo-Dateien
  - Default: `['**/*.demo.ts']`
- `route?: string`
  - Route, unter der der Viewer im Dev-Server ausgeliefert wird
  - Default: `'/__tdemo'`

## Wie definiert man Demos?

Es gibt zwei übliche Varianten.

### 1. Als Objekt mit `defineDemo(...)`

```ts
import { defineDemo } from '@trunkjs/vite-demo-viewer';

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
import { defineDemo } from '@trunkjs/vite-demo-viewer';
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
import { defineDemo } from '@trunkjs/vite-demo-viewer';
import style from './demo.scss?inline';

export default defineDemo({
  title: 'Inline SCSS',
  css: ['default', style],
  html: '<div class="box">Hallo</div>',
});
```

### Markdown-Demo

```ts
import { defineDemo } from '@trunkjs/vite-demo-viewer';

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
import { defineDemo } from '@trunkjs/vite-demo-viewer';
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
import { defineDemo } from '@trunkjs/vite-demo-viewer';

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
import { defineDemo } from '@trunkjs/vite-demo-viewer';

export default defineDemo({
  title: 'Custom Controls',
  html: '<p>Mit eigenem Controls-Markup</p>',
  controls_raw_html: `
    <button onclick="console.log('custom')">Custom Button</button>
  `,
});
```

## Statischer Export

Mit `viteDemoExporter` kann ein statisch deploybarer Build erzeugt werden:

```ts
import { viteDemoExporter } from '@trunkjs/vite-demo-viewer';

await new viteDemoExporter('dist/demo-static').build();
```

### Export mit Optionen

```ts
import { viteDemoExporter } from '@trunkjs/vite-demo-viewer';

await new viteDemoExporter('dist/demo-static', {
  include: ['packages/ui/demo/**/*.demo.ts'],
  title: 'UI Demo Viewer',
}).build();
```

## Exporter-Optionen

- `outDir: string`
  - Zielverzeichnis für den statischen Export
- `include?: string[]`
  - Glob-Patterns für Demos
  - Default: `['**/*.demo.ts']`
- `title?: string`
  - HTML-Title der Export-Seite
  - Default: `'TDemo Viewer'`

## Hinweise

- Der Viewer rendert über `<tj-demo-viewer>` und nutzt intern `<tj-demo-viewer-nav>`.
- `demo.markdown` wird im Renderer per `MarkdownDocument` in DOM umgewandelt.
- Das Default-Stylesheet des Renderers kommt aus `@trunkjs/demo-viewer-frontend` und nutzt intern ein `codestyle()`-Mixin.
- Aufgeklappte Navigationsknoten werden im `sessionStorage` gespeichert.
