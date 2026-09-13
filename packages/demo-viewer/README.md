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
- `<tj-demo-toast>`
- `DemoRegistry`
- `defineDemo(...)`
- Viewer-Typen (`TDemoDefinition`, `TNavData`, ...)

## Dev-Server-Mockup

Dieses Paket enthält zusätzlich ein lokales Mockup für den Vite-Dev-Server:

- `index.html`
- `src/mock/tjDemoViewerClient.js`
- `demo/**/*.demo.ts`

Damit lässt sich der Frontend-Viewer standalone im Browser starten. Die Route `/__tdemo` wird dabei genauso bedient wie im `@trunkjs/vite-demo-viewer`-Plugin.

## Controls

Demos definieren alle Interaktionen über eine einzige Controls-API:

```ts
export default defineDemo({
  html: '<dialog>Inhalt</dialog>',
  controls: {
    items: [{
      id: 'open',
      type: 'button',
      label: 'Öffnen',
      onClick(_, env) {
        env.query<HTMLDialogElement>('dialog').showModal();
      },
    }],
  },
});
```

Der Demo-Kontext stellt Statuszugriffe über `env.controls` bereit. Die Vite-Integration extrahiert Handler-Code aus den Controls für die Code-Section.

## Toasts, Logging und Eventlisten

Der Demo Viewer besitzt eine gemeinsame Benachrichtigungs- und Logging-Oberfläche. Demos sollen dafür keine eigenen Toast-Container oder Log-Panels rendern.

```ts
onClick(_, env) {
  const toastId = env.toast.show('Speichern läuft …', { title: 'Status' });

  void save().then(
    result => {
      env.toast.dismiss(toastId);
      env.toast.show('Gespeichert', { title: 'Erfolg' });
      env.toast.log('save result', result);
    },
    error => {
      env.toast.dismiss(toastId);
      env.toast.log('save failed', error);
    },
  );
}
```

- `env.toast.show(message, { title? })` zeigt einen kurzlebigen Toast und liefert dessen numerische ID.
- `env.toast.dismiss(id)` entfernt einen bestimmten Toast vorzeitig.
- `env.toast.log(...values)` ergänzt den persistenten Logging-Toast.
- `env.toast.clearLog()` leert den persistenten Log.
- `console.log` und `console.error` werden ebenfalls in den Logging-Toast gespiegelt.

Eine vom Viewer dargestellte Eventliste wird als `output`-Control definiert und mit `env.controls.setValue(...)` aktualisiert:

```ts
controls: {
  items: [
    { id: 'events', type: 'output', label: 'Events', value: 'Noch keine Events.' },
  ],
},
afterRender(env) {
  const events: string[] = [];
  const element = env.query('example-element');
  const onChanged = (event: Event) => {
    events.push(JSON.stringify((event as CustomEvent).detail));
    env.controls.setValue('events', events.join('\n'));
    env.toast.show('changed', { title: 'Component event' });
  };

  element.addEventListener('changed', onChanged);
  return () => element.removeEventListener('changed', onChanged);
},
```

`output`-Controls erscheinen nicht in der Controls-Leiste. Ihr initialer Wert und spätere Aktualisierungen werden mit ihrem Label in den persistenten Logging-Toast geschrieben.

## Isolierter Viewport per iframe

Demos mit Fixed-Positioning, viewportbezogenen Größen oder responsivem Verhalten können im normalen Viewer in einem eigenen Viewport laufen:

```ts
export default defineDemo({
  title: 'Responsive navigation',
  iframe: true,
  html: '<header>...</header>',
});
```

Der normale Viewer zeigt für diese Demo ausschließlich ein rahmenloses iframe. Das iframe lädt dieselbe Viewer-URL mit unverändertem Demo-Hash und `?view=fullscreen`; dort wird die Demo regulär inklusive `afterRender` und Controls ausgeführt. Im direkten Fullscreen- und Source-Modus wird kein weiteres iframe erzeugt.

## Hinweis

Das Vite-Plugin selbst bleibt in `@trunkjs/vite-demo-viewer`.
