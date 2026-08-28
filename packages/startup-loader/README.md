# @trunkjs/startup-loader

Coordinates startup-aware custom elements and reveals the page after they are ready. The loader UI is optional and supplied by the active theme through the `loader` slot.

## Setup

Import the component and include the small critical stylesheet before the module runs so uninitialized content cannot flicker:

```ts
import '@trunkjs/startup-loader';
import '@trunkjs/startup-loader/index.scss';
```

```html
<tj-startup-loader scope="global" debug>
  <div slot="loader">Initializing…</div>
  <app-config></app-config>
  <app-layout></app-layout>
</tj-startup-loader>
```

The dependency graph is configured by the participating components, not in HTML. Root runlevels are detected automatically and initialize in parallel. A dependent runlevel starts after every registered element in each referenced runlevel has settled.

## StartupLoaderMixin

`StartupLoaderMixin` registers a Lit/ReactiveElement before calling its base `connectedCallback()` and reports readiness after `firstUpdated()`.

```ts
import { StartupLoaderMixin } from '@trunkjs/browser-utils';
import { LitElement } from 'lit';

class AppConfig extends StartupLoaderMixin(LitElement) {
  override runLevel = 'configuration';
}

class AppLayout extends StartupLoaderMixin(LitElement) {
  override dependsOn = ['configuration'];

  override async connectedCallback() {
    await super.connectedCallback();
    // Dependency-safe initialization belongs here.
  }
}
```

When overriding `connectedCallback()`, always await `super.connectedCallback()` so `dependsOn` can delay the component's initialization. Set `runLevel` and `dependsOn` as class fields, in the constructor, or before the element connects.

The default `runLevel` is the element's tag name (`localName`). Consequently, multiple instances of the same component automatically share one runlevel. A dependent runlevel waits until all of those instances have reported readiness. Override `runLevel` only to group different component types or to use a stable application-level name.

The global queue lives on `window.tj_startup_loader`, so registrations work even when the startup-loader bundle is loaded after its child components.

## Global and local scope

- `scope="global"` is the default and coordinates registered elements across the page. Only one global loader may be active.
- `scope="local"` coordinates only elements whose nearest `<tj-startup-loader>` ancestor is that loader.

The nearest local loader wins over the global loader.

## Waiting programmatically

Existing wait helpers support both a loader phase and selected runlevels:

```ts
import { waitForReady, waitForVisual } from '@trunkjs/browser-utils';

await waitForReady({ target: this, dependsOn: ['configuration', 'app-layout'] });
await waitForVisual({ target: this });
```

Without an active startup loader the helpers retain their previous fallback and wait for `window.load`.

## Debugging and errors

Add `debug` to `<tj-startup-loader>` for registration, start, completion, and phase logs using the shared `LoggingMixin` format. Warnings and errors are always logged and also emitted as `startup-loader:error` events.

Inspect the current graph and its blockers programmatically:

```ts
import type { StartupLoaderElement } from '@trunkjs/startup-loader';

const loader = document.querySelector<StartupLoaderElement>('tj-startup-loader');
console.table(loader?.getRunLevelStatus());
```

Each status identifies automatically detected roots and contains the runlevel state, dependencies, unresolved `blockedBy` runlevels, and the state of every participating element. The loader reports missing runlevels, the concrete path of dependency cycles, inconsistent dependencies within a shared runlevel, initialization exceptions, and the element that exceeded the four-second readiness timeout. Error events include the same graph snapshot. Dependency errors fail open so one broken element does not leave the page permanently hidden.

## Events

- `startup-loader:element-ready`
- `startup-loader:ready`
- `startup-loader:pre-visual`
- `startup-loader:visual`
- `startup-loader:error`
