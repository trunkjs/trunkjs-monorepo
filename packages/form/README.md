# @trunkjs/form

Grundstruktur für das neue Form-Paket.

Aktuell enthält das Paket:

- `FormScope` zum Lesen/Schreiben einfacher Form-Daten
- `FormValuePluginRegistry` für Plugin-Verwaltung und Lookup
- ein Plugin-System für unterschiedliche Formular-Elemente
- eine erste Demo unter `demo/basic.demo.ts`
- eine Vite-Konfiguration mit `@trunkjs/vite-demo-viewer`

## Nutzung

```ts
import { FormScope, FormValuePluginRegistry, formValuePluginRegistry } from '@trunkjs/form';

const form = document.querySelector('form');
const scope = new FormScope(form!);

scope.data = {
  name: 'Max',
  newsletter: true,
};

console.log(scope.data);

const registry = formValuePluginRegistry();
const customRegistry = new FormValuePluginRegistry();
```

## Standard-Plugins

Aktuell sind Standard-Plugins enthalten für:

- `input` (textartige Typen)
- `input[type=checkbox]`
- `input[type=radio]`
- `textarea`
- `select`

## Demo lokal starten

```bash
cd packages/form
npx vite
```

Danach ist der Demo-Viewer unter `/__tdemo` verfügbar.
