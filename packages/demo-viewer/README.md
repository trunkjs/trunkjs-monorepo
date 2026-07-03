# @trunkjs/demo-viewer

Browser-side Runtime und Web Components für den Demo-Viewer.

## Import

```ts
import '@trunkjs/demo-viewer';
```

Oder gezielt:

```ts
import { DemoRegistry, defineDemo, TjDemoViewer } from '@trunkjs/demo-viewer';
```

## Enthalten

- `<tj-demo-viewer>`
- `<tj-demo-viewer-nav>`
- `<tj-demo-viewer-nav-tree>`
- `<tj-demo>`
- `<tj-demo-renderer>`
- `<tj-demo-controls>`
- `DemoRegistry`
- `defineDemo(...)`
- Viewer-Typen (`TDemoDefinition`, `TNavData`, ...)

## Dev-Server-Mockup

Dieses Paket enthält zusätzlich ein lokales Mockup für den Vite-Dev-Server:

- `index.html`
- `src/mock/tjDemoViewerClient.js`
- `demo/**/*.demo.ts`

Damit lässt sich der Frontend-Viewer standalone im Browser starten. Die Route `/__tdemo` wird dabei genauso bedient wie im `@trunkjs/vite-demo-viewer`-Plugin.

## Hinweis

Das Vite-Plugin selbst bleibt in `@trunkjs/vite-demo-viewer`.
