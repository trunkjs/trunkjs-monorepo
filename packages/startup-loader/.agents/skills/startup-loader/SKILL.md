---
name: startup-loader
description: Use when integrating startup-aware elements with @trunkjs/startup-loader.
---

# Startup Loader

Use `<tj-startup-loader>` to coordinate initial page components and prevent partially initialized content from becoming visible.

## Rules

- Use one global loader unless an isolated subtree explicitly needs `scope="local"`.
- Add `startup-id` only when another element needs to depend on that element.
- Declare dependencies with `depends-on="id-one id-two"`.
- Keep independent elements dependency-free so they can initialize in parallel.
- Use `StartupLoaderMixin` for Lit/ReactiveElement components.
- Await `super.connectedCallback()` in overridden async `connectedCallback()` methods.
- Use `waitForReady({ target, dependsOn })` for programmatic dependency waits.
- Add `debug` to the loader when diagnosing registration order or readiness timeouts.
- Listen for `startup-loader:error` when application-level error reporting is required.

## Example

```html
<tj-startup-loader scope="global">
  <div slot="loader">Initializing…</div>
  <app-config startup-id="config"></app-config>
  <app-layout startup-id="layout" depends-on="config"></app-layout>
</tj-startup-loader>
```
