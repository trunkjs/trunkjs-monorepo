---
name: vite-demo-viewer-setup
description: Install and configure @trunkjs/vite-demo-viewer for package-local Vite serving, Nx projects, a combined docs build, or GitHub Pages. Do not use for authoring individual demo definitions.
---

# Vite Demo Viewer Setup

Use this skill for installation and infrastructure around `@trunkjs/vite-demo-viewer`. When the task is to create or change `.demo.ts` files, use the separate `demo-viewer` skill.

Choose the reference that matches the requested setup:

- For a single package developed with `nx serve <project>`, read [references/package-serve.md](references/package-serve.md).
- For one combined viewer under `docs`, a static Vite build, or GitHub Pages, read [references/github-pages.md](references/github-pages.md).

## Invariants

- Keep the package's root entry files such as `index.ts`, `index.js`, and `index.d.ts` at the package root when that repository uses this convention.
- Use one `tjDemoViewerPlugin(...)` call. Serve and build are modes of the same public plugin.
- Static viewer builds are opt-in with `build: true`; do not enable this in a normal library build.
- Use hash navigation under `#/demo/...`. GitHub Pages has no universal SPA rewrite.
- Set Vite `base` for the Pages hosting path; do not hard-code `/assets/...` URLs.
- Prefer Nx target inference through the repository's existing `@nx/vite/plugin`. Do not duplicate a `serve` target when Nx already infers it.
- Preserve source inspection for relative `.scss` imports: both `?inline` and `?url` imports are exposed uncompiled through `sourceInfo.styles` and shown as separate **Show code** tabs. This requires no plugin option.
- Adapt package names and paths to the repository instead of copying placeholders literally.
