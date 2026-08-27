---
name: vite-demo-viewer
description: Configure @trunkjs/vite-demo-viewer for local package development or a monorepo-wide static GitHub Pages demo site. Use when adding or changing demo serving, Nx project configuration, docs builds, Vite base paths, or Pages deployment for component demos.
---

# Vite Demo Viewer

Use `@trunkjs/vite-demo-viewer` only for Vite and Node integration. Demo definitions and browser types belong to `@trunkjs/demo-viewer`.

Choose the reference that matches the requested mode:

- For a single package developed with `nx serve <project>`, read [references/package-serve.md](references/package-serve.md).
- For one combined viewer under `docs`, a static Vite build, or GitHub Pages, read [references/github-pages.md](references/github-pages.md).

## Invariants

- Demo files end in `.demo.ts`.
- Keep the package's root entry files such as `index.ts`, `index.js`, and `index.d.ts` at the package root when that repository uses this convention.
- Use one `tjDemoViewerPlugin(...)` call. Serve and build are modes of the same public plugin.
- Static viewer builds are opt-in with `build: true`; do not enable this in a normal library build.
- Use hash navigation under `#/demo/...`. GitHub Pages has no universal SPA rewrite.
- Set Vite `base` for the Pages hosting path; do not hard-code `/assets/...` URLs.
- Prefer Nx target inference through the repository's existing `@nx/vite/plugin`. Do not duplicate a `serve` target when Nx already infers it.
- Adapt package names and paths to the repository instead of copying placeholders literally.
