---
name: demo-viewer
description: Create or update @trunkjs/demo-viewer .demo.ts files, including HTML, Markdown, render functions, wrappers, CSS, metadata, and controls. Do not use for Vite, Nx, docs, or GitHub Pages setup.
---

# Demo Viewer

Use this skill for the contents of individual demo files. Use `vite-demo-viewer-setup` when the task concerns Vite, Nx targets, aggregate docs builds, or GitHub Pages.

Read only the reference needed for the requested demo:

- For file placement, metadata, HTML, Markdown, wrappers, render functions, and CSS, read [references/creating-demos.md](references/creating-demos.md).
- For standard controls or custom control markup, read [references/controls.md](references/controls.md).

## Invariants

- Name demo files `*.demo.ts`; do not use the older `*.tdemo.ts` suffix.
- Import `defineDemo` from `@trunkjs/demo-viewer`, not from `@trunkjs/vite-demo-viewer`.
- Put package demos in that package's existing `demo` directory unless the repository uses another established location.
- Let the Vite plugin assign `filename`; set it manually only when the requested navigation identity must differ from the source path.
- Preserve existing package conventions and avoid changing Vite or project configuration while only authoring demos.
- Keep demos focused on observable component states. Do not add unrelated production components or test infrastructure.
- Import demo SCSS through a relative `.scss?inline` or `.scss?url` path. With `@trunkjs/vite-demo-viewer`, the original uncompiled SCSS is then automatically available as a separate **Show code** tab; do not duplicate it manually in `sourceInfo`.
- Use the built-in `controls` definition for buttons, inputs, JSON editors, outputs, and other demo interactions. Define it as `{ items: [...] }`. Do not use the removed `actionBar` or the legacy controls array, and do not build a separate controls toolbar inside `render`, HTML, or Markdown.
- Use `env.toast.show(message, { title })` for temporary status notifications; keep the returned id only when the demo must dismiss that toast explicitly with `env.toast.dismiss(id)`.
- Use `env.toast.log(...values)` for persistent diagnostic or event output and `env.toast.clearLog()` to clear it. `console.log` and `console.error` are mirrored there, but explicit `env.toast.log(...)` is preferred when log output is part of the demo contract.
- Model a viewer-owned event list as a control item with `type: 'output'` and update it through `env.controls.setValue(id, value)`; output controls appear in the persistent logging toast, not in the controls toolbar.
