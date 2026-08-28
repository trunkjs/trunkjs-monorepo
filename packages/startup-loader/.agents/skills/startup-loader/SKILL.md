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
- Add a unique `startup-id` only when another element or wait call refers to that element.
- Declare real initialization dependencies with `depends-on="id-one id-two"`. Values are startup IDs, not selectors.
- Leave independent elements without `depends-on`; they initialize in parallel.
- For asynchronous work that must delay dependents, report readiness only after that work has completed. Do not let the default first update signal readiness early.

```ts
import { LoggingMixin, StartupLoaderMixin } from '@trunkjs/browser-utils';
import { LitElement } from 'lit';

class AppLayout extends StartupLoaderMixin(LitElement) {
  override async connectedCallback() {
    await super.connectedCallback();
    // Initialization here starts only after declared dependencies are ready.
  }
}
```

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
- Expect dependency errors to fail open. Missing IDs, cycles, exceptions, and four-second readiness timeouts are logged with the affected element so one failure does not permanently block the reveal.

## `depends-on` example

```html
<tj-startup-loader scope="global">
  <div slot="loader">Initializing…</div>

  <app-config startup-id="config"></app-config>
  <user-session startup-id="session" depends-on="config"></user-session>
  <app-shell depends-on="config session"></app-shell>
</tj-startup-loader>
```

`app-config` starts immediately. `user-session` starts after `config` reports readiness. `app-shell` starts only after both `config` and `session` have settled. All three participating components must use `StartupLoaderMixin`; `app-shell` does not need its own `startup-id` because no later element refers to it.

## `waitForReady` example

Use the helper when code must wait for startup dependencies but is not itself ordered through `StartupLoaderMixin`:

```ts
import { waitForReady } from '@trunkjs/browser-utils';

class AppAnalytics extends HTMLElement {
  async connectedCallback() {
    await waitForReady({
      target: this,
      dependsOn: ['config', 'session'],
    });

    this.startAnalytics();
  }
}
```

With `dependsOn`, the promise resolves when the listed startup IDs have settled; it does not wait for every startup element on the page. Without `dependsOn`, `await waitForReady({ target: this })` waits for the owning loader's complete `ready` phase. `target` selects the nearest local parent loader and otherwise the global loader.

## Do

- Put all content that must reveal together inside the loader.
- Supply loader visuals through `slot="loader"`; keep them theme-owned and optional.
- Model only necessary dependencies and keep chains short.
- Preserve error details and affected elements when forwarding `startup-loader:error` to application logging.
- Verify the page with cache disabled and network/CPU throttling after changing startup markup or critical CSS.

## Don't

- Do not use the component to calculate or display fake percentage progress.
- Do not wait for unrelated components merely to force a visual order.
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

5. Add `startup-id` and `depends-on` only where ordering is required. Do not reproduce the old loader's flat wait set as one large dependency chain.

6. Search the application for `@trunkjs/loader`, `tj-loader`, `LoaderMixin`, `loader:`, `tj_loader_state`, and `init:child-`. Remove all remaining runtime references before completing the migration. The deprecated `LoaderMixin` export from current Browser Utils is only a temporary source-compatibility alias, not the target API.

7. Run once with `<tj-startup-loader debug>` and verify registrations, start order, readiness, reveal phases, timeouts, and application-level error forwarding.
