---
name: startup-loader
description: Integrate, review, or migrate pages that use @trunkjs/startup-loader for flicker-free startup coordination, component dependencies, and loader-aware wait helpers.
---

# Startup Loader

Use `<tj-startup-loader>` when a page must keep its initial content hidden until participating custom elements have initialized. Treat it as a startup coordinator with an optional loader slot, not as a progress-bar component or a general-purpose task scheduler.

For page-level CSS and markup ordering, read [references/flicker-free-page-setup.md](references/flicker-free-page-setup.md). Read that reference whenever creating a page shell, changing the loader's placement, or diagnosing a first-paint flash.

## Choose the scope

- Use one `scope="global"` loader, or omit the attribute because global is the default, for the application shell.
- Use `scope="local"` only for an independently revealed subtree. The nearest parent startup loader owns its participating descendants.
- Keep the loader element in the initial HTML. The global queue supports a loader custom element that is not defined yet; it cannot reliably coordinate a loader inserted after startup has already proceeded.

## Register startup-aware elements

- Use `StartupLoaderMixin` for Lit/ReactiveElement components.
- Await `super.connectedCallback()` in overridden async `connectedCallback()` methods.
- Configure ordering in the component class with the programmatic `runLevel` and `dependsOn` properties. Do not put dependency metadata in HTML.
- Keep the default `runLevel` when grouping by component type is correct. It is the element's `localName`, such as `app-config`.
- Override `runLevel` only when different element types form one barrier or the application needs a stable logical name.
- Leave independent elements without `dependsOn`; the loader detects these root runlevels and initializes them in parallel.
- For asynchronous work that must delay dependents, report readiness only after that work has completed. Do not let the default first update signal readiness early.

```ts
import { LoggingMixin, StartupLoaderMixin } from '@trunkjs/browser-utils';
import { LitElement } from 'lit';

class AppConfig extends StartupLoaderMixin(LitElement) {
  override runLevel = 'configuration';
}

class AppLayout extends StartupLoaderMixin(LitElement) {
  override dependsOn = ['configuration'];

  override async connectedCallback() {
    await super.connectedCallback();
    // Starts only after every element in "configuration" has settled.
  }
}
```

Set these properties as class fields, in the constructor, or before connection. The mixin snapshots them during `connectedCallback()`.

## Runlevels and repeated elements

A runlevel is a graph node and a group barrier, not an element ID. Every registered element in a runlevel starts together, and the runlevel settles only after all of them have reported `ready`, `disconnected`, or `error`.

Repeated instances automatically share their tag-name runlevel:

```ts
class FeatureCard extends StartupLoaderMixin(LitElement) {}

class AppShell extends StartupLoaderMixin(LitElement) {
  override dependsOn = ['feature-card'];
}
```

If the page registers five `<feature-card>` elements during startup, `app-shell` waits for all five. No HTML IDs are required. All instances assigned to one runlevel should declare the same dependencies. If they do not, the loader merges the dependencies conservatively and logs a warning.

The initial graph closes at `DOMContentLoaded`. Insert startup participants before that boundary or synchronously while earlier startup work creates the initial component tree. Registrations after the reveal has begun initialize immediately and do not reopen an already visible page.

The mixin normally reports readiness from its `firstUpdated()` implementation. When asynchronous initialization must also delay dependents, hold that signal and invoke the parent implementation exactly once after the work settles:

```ts
class AppData extends StartupLoaderMixin(LoggingMixin(LitElement)) {
  #startupChangedProperties = new Map<string, unknown>();
  #startupReadyReported = false;

  override firstUpdated(changedProperties: Map<string, unknown>) {
    this.#startupChangedProperties = changedProperties;
  }

  override async connectedCallback() {
    await super.connectedCallback();
    try {
      await this.loadInitialData();
    } catch (error) {
      this.error('Initial data loading failed.', error, this);
    } finally {
      if (!this.#startupReadyReported) {
        this.#startupReadyReported = true;
        super.firstUpdated(this.#startupChangedProperties);
      }
    }
  }
}
```

The shared logger preserves the error while the `finally` block reports fail-open readiness. Do not call the parent `firstUpdated()` twice.

## Wait and observe

- Use `waitForReady({ target, dependsOn })` for programmatic dependency waits.
- Pass `target` when local loaders may exist so Browser Utils selects the nearest parent loader.
- Use `waitForPreVisual({ target })` immediately before reveal-dependent work and `waitForVisual({ target })` after the reveal transition.
- Keep the no-loader fallback: the wait helpers resolve through `window.load` when no startup loader is active.
- Add `debug` to the loader when diagnosing registration order or readiness timeouts.
- Listen for `startup-loader:error` when application-level error reporting is required.
- Call `getRunLevelStatus()` on the loader to inspect every node's state, dependencies, `blockedBy` list, and member elements.
- Expect dependency errors to fail open. Missing runlevels, cycles, exceptions, and four-second readiness timeouts are logged with the affected element and a graph snapshot so one failure does not permanently block the reveal.

## Programmatic `dependsOn` example

```ts
class AppConfig extends StartupLoaderMixin(LitElement) {
  override runLevel = 'configuration';
}

class UserSession extends StartupLoaderMixin(LitElement) {
  override runLevel = 'session';
  override dependsOn = ['configuration'];
}

class AppShell extends StartupLoaderMixin(LitElement) {
  override dependsOn = ['configuration', 'session'];
}
```

`configuration` is a root and starts immediately. `session` starts after every `configuration` member has settled. The default `app-shell` runlevel starts only after both dependencies have settled. All participating components use `StartupLoaderMixin`; the markup contains only the elements themselves.

## `waitForReady` example

Programmatic `dependsOn` through `waitForReady` is the primary form for application initialization code. Use it when code must wait for selected startup dependencies but is not itself ordered through `StartupLoaderMixin`:

```ts
import { waitForReady } from '@trunkjs/browser-utils';

class AppAnalytics extends HTMLElement {
  async connectedCallback() {
    await waitForReady({
      target: this,
      dependsOn: ['configuration', 'session'],
    });

    this.startAnalytics();
  }
}
```

Dependencies can be assembled at runtime:

```ts
import { waitForReady } from '@trunkjs/browser-utils';

async function startDashboard(host: HTMLElement, requiresSession: boolean) {
  const dependsOn = ['configuration'];
  if (requiresSession) dependsOn.push('session');

  await waitForReady({ target: host, dependsOn });
  await mountDashboard(host);
}
```

With `dependsOn`, the promise resolves when all elements in the listed runlevels have settled; it does not wait for every startup element on the page. Without `dependsOn`, `await waitForReady({ target: this })` waits for the owning loader's complete `ready` phase. `target` selects the nearest local parent loader and otherwise the global loader.

## Do

- Put all content that must reveal together inside the loader.
- Supply loader visuals through `slot="loader"`; keep them theme-owned and optional.
- Let each component declare its own `runLevel` and `dependsOn` programmatically.
- Prefer `waitForReady({ target, dependsOn })` for programmatic startup operations.
- Model only necessary dependencies and keep chains short.
- Use `<tj-startup-loader debug>` and `getRunLevelStatus()` to locate blockers.
- Preserve error details and affected elements when forwarding `startup-loader:error` to application logging.
- Verify the page with cache disabled and network/CPU throttling after changing startup markup or critical CSS.

## Don't

- Do not use the component to calculate or display fake percentage progress.
- Do not wait for unrelated components merely to force a visual order.
- Do not use `startup-id` or `depends-on` attributes; dependencies belong to the component implementation.
- Do not give members of the same runlevel different dependency sets.
- Do not dispatch the legacy `init:child-waitreq` or `init:child-ready` events manually.
- Do not read or write the global queue as application state. Prefer the mixin and wait helpers.
- Do not lazy-load the critical anti-flicker CSS or place it after the module entry.
- Do not hide the loader slot with the same critical selector used for application content.

## Migrate from `@trunkjs/loader`

1. Replace the package and element names:

   - `@trunkjs/loader` → `@trunkjs/startup-loader`
   - `<tj-loader>` → `<tj-startup-loader>`
   - `LoaderMixin` → `StartupLoaderMixin`

2. Replace legacy event and state usage:

   - `loader:ready` → `startup-loader:ready`
   - `loader:pre-visual` → `startup-loader:pre-visual`
   - `loader:visual` → `startup-loader:visual`
   - `window.tj_loader_state` → use `waitForReady`, `waitForPreVisual`, or `waitForVisual`; use `window.tj_startup_loader_state` only for diagnostics.
   - Remove `init:child-waitreq` and `init:child-ready`; `StartupLoaderMixin` registers through the shared queue.

3. Import the critical stylesheet from `@trunkjs/startup-loader/index.scss` through the page's blocking CSS path, or inline the rules documented in [the flicker-free setup reference](references/flicker-free-page-setup.md).

4. Make every overridden `connectedCallback()` asynchronous and `await super.connectedCallback()` before dependency-sensitive initialization.

5. Remove `startup-id` and `depends-on` attributes. Translate an old logical startup ID to a programmatic `runLevel` property, and translate its dependency list to `dependsOn` on the component class. Prefer the default tag-name runlevel where it already expresses the intended group.

6. Search the application for `@trunkjs/loader`, `tj-loader`, `LoaderMixin`, `loader:`, `tj_loader_state`, `init:child-`, `startup-id`, and `depends-on`. Remove all remaining runtime references before completing the migration. The deprecated `LoaderMixin` export from current Browser Utils is only a temporary source-compatibility alias, not the target API.

7. Run once with `<tj-startup-loader debug>` and verify registrations, start order, readiness, reveal phases, timeouts, and application-level error forwarding.
