# @trunkjs/scope

Grundstruktur für das neue Scope-Paket.

Aktuell enthält das Paket:

- einen minimalen Einstiegspunkt unter `src/index.ts`
- eine erste Demo unter `demo/basic.demo.ts`
- eine Vite-Konfiguration mit `@trunkjs/vite-demo-viewer`

## Nutzung

```ts
import { createScopeDemoMessage } from '@trunkjs/scope';

console.log(createScopeDemoMessage());
console.log(createScopeDemoMessage('Workspace'));
```

## Demo lokal starten

```bash
cd packages/scope
npx vite
```

Danach ist der Demo-Viewer unter `/__tdemo` verfügbar.
