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
- Use the built-in `actionBar` for buttons, inputs, JSON editors, outputs, and other demo interactions. Do not build a separate controls toolbar inside `render`, HTML, or Markdown.
- Use `env.toast.show(...)` for temporary notifications and `env.toast.log(...)` for persistent log output. Action-bar items with `type: 'output'` are written to the logging toast instead of controls.
