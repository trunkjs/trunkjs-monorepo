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
  <app-config startup-id="config"></app-config>
  <app-layout startup-id="layout" depends-on="config"></app-layout>
</tj-startup-loader>
```

Independent elements initialize in parallel. An element with `depends-on` starts after all referenced `startup-id` elements are ready. Multiple dependencies can be separated by spaces or commas.

## StartupLoaderMixin

`StartupLoaderMixin` registers a Lit/ReactiveElement before calling its base `connectedCallback()` and reports readiness after `firstUpdated()`.

```ts
import { StartupLoaderMixin } from '@trunkjs/browser-utils';
import { LitElement } from 'lit';

class AppLayout extends StartupLoaderMixin(LitElement) {
  override async connectedCallback() {
    await super.connectedCallback();
    // Dependency-safe initialization belongs here.
  }
}
```

When overriding `connectedCallback()`, always await `super.connectedCallback()` so `depends-on` can delay the component's initialization.

The global queue lives on `window.tj_startup_loader`, so registrations work even when the startup-loader bundle is loaded after its child components.

## Global and local scope

- `scope="global"` is the default and coordinates registered elements across the page. Only one global loader may be active.
- `scope="local"` coordinates only elements whose nearest `<tj-startup-loader>` ancestor is that loader.

The nearest local loader wins over the global loader.

## Waiting programmatically

Existing wait helpers support both a loader phase and selected dependency IDs:

```ts
import { waitForReady, waitForVisual } from '@trunkjs/browser-utils';

await waitForReady({ target: this, dependsOn: ['config', 'layout'] });
await waitForVisual({ target: this });
```

Without an active startup loader the helpers retain their previous fallback and wait for `window.load`.

## Debugging and errors

Add `debug` to `<tj-startup-loader>` for registration, start, completion, and phase logs using the shared `LoggingMixin` format. Warnings and errors are always logged and also emitted as `startup-loader:error` events.

The loader reports duplicate IDs, missing dependencies, dependency cycles, initialization exceptions, and the element that exceeded the four-second readiness timeout. Dependency errors fail open so one broken element does not leave the page permanently hidden.

## Events

- `startup-loader:element-ready`
- `startup-loader:ready`
- `startup-loader:pre-visual`
- `startup-loader:visual`
- `startup-loader:error`
