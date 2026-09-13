---
name: demo-viewer
description: MUST be read whenever creating, converting, fixing, or reviewing a component or package demo, especially any `*.demo.ts` file. Define executable demos with `defineDemo()` and `render()` from `@trunkjs/demo-viewer`; use `afterRender()` for completed-DOM initialization and `env.controls` for Demo Viewer controls. Use `vite-demo-viewer-setup` only for Vite, Nx, static-site, or deployment configuration.
---

# Demo Viewer

Use this skill for the contents of individual demo files. Use `vite-demo-viewer-setup` when the task concerns Vite, Nx targets, aggregate docs builds, or GitHub Pages.

Read only the reference needed for the requested demo:

- For file placement, metadata, HTML, Markdown, wrappers, render functions, and CSS, read [references/creating-demos.md](references/creating-demos.md).
- For standard controls or custom control markup, read [references/controls.md](references/controls.md).

## Invariants

- Name demo files `*.demo.ts`; do not use the older `*.tdemo.ts` suffix.
- Define every executable component or package demo with `defineDemo()` from `@trunkjs/demo-viewer` and provide `render(root)` as its inspectable example code. Use `html` or `markdown` without `render()` only for intentionally static content demos.
- Keep `render(root)` focused on rendering the observable example. Put initialization that requires the completed demo DOM, event listener registration, and corresponding cleanup in `afterRender(env)`.
- Use `env.query()`, `env.queryOptional()`, and `env.queryAll()` inside `afterRender()` and control handlers instead of global document queries.
- Import `defineDemo` only from `@trunkjs/demo-viewer`. `@trunkjs/vite-demo-viewer` owns discovery and build integration, not demo authoring.
- Put package demos in that package's existing `demo` directory unless the repository uses another established location.
- Let the Vite plugin assign `filename`; set it manually only when the requested navigation identity must differ from the source path.
- Preserve existing package conventions and avoid changing Vite or project configuration while only authoring demos.
- Keep demos focused on observable component states. Do not add unrelated production components or test infrastructure.
- Add concise comments directly to the example source for non-obvious setup, lifecycle behavior, control coordination, asynchronous flows, and cleanup. Explain the reason or invariant rather than restating self-explanatory code.
- Import demo SCSS through a relative `.scss?inline` or `.scss?url` path. With `@trunkjs/vite-demo-viewer`, the original uncompiled SCSS is then automatically available as a separate **Show code** tab; do not duplicate it manually in `sourceInfo`.
- Define external demo configuration, observation, and diagnostic actions through `controls: { items: [...] }` and coordinate them through `env.controls`. Keep intrinsic component controls inside the rendered demo content.
- Do not use the removed `actionBar` or the legacy controls array, and do not build a separate controls toolbar inside `render`, HTML, or Markdown.
- Use `env.toast.show(message, { title })` for temporary status notifications; keep the returned id only when the demo must dismiss that toast explicitly with `env.toast.dismiss(id)`.
- Use `env.toast.log(...values)` for persistent diagnostic or event output and `env.toast.clearLog()` to clear it. `console.log` and `console.error` are mirrored there, but explicit `env.toast.log(...)` is preferred when log output is part of the demo contract.
- Model a viewer-owned event list as a control item with `type: 'output'` and update it through `env.controls.setValue(id, value)`; output controls appear in the persistent logging toast, not in the controls toolbar.
- Verify the actual `*.demo.ts` entry through the configured Demo Viewer/Vite integration; a library-only build does not verify imported demo HTML, SCSS, lifecycle code, or controls.
