---
name: trunkjs-api-skill
description: Use this skill to choose TrunkJS packages, understand their public role, and route to package-local skills before writing application or component code.
---

# TrunkJS API Skill

This is the repository-wide routing and orientation skill for `trunkjs/trunkjs-monorepo`. It is code-free and complements, rather than replaces, package-local skills under `packages/<package>/skills/`.

## Repository rules

- Prefer existing package-local skills for concrete APIs and examples.
- Package skills live under `packages/<package>/skills/<skill>/` and are intended to ship with the npm package.
- Reuse existing repository patterns and public entrypoints instead of importing private source files from another package.
- Treat legacy `.ai-usage-info.md` files as source material; package-local skills are the maintained contract when present.

## Package map

| Package | Purpose | Important public surface / typical use |
|---|---|---|
| `@trunkjs/api-stub` | API stubbing/test support. | Public entrypoint re-exports its stub utilities; use for controlled API/test doubles after checking the package source contract. |
| `@trunkjs/ast-markdown` | Markdown/AST processing. | Use when transforming or inspecting Markdown structurally rather than rendering it directly. |
| `@trunkjs/browser-utils` | Browser-side DOM, form, timing, storage, breakpoints, events, logging, loader coordination, and custom-element/Lit helpers. | Package-local `browser-utils-usage` is the primary routing skill. `FormDataAccessor` is available for named native/custom form controls and `FormData` creation. |
| `@trunkjs/content-pane` | Render and structurally transform Markdown/Kramdown content into layout-aware HTML/custom elements. | `<tj-content-pane>` plus Content Pane layout/content-element contracts. Use `content-pane-usage` for pages/CMS/Jekyll and `content-pane-content-elements` when building slot-routing custom elements. |
| `@trunkjs/demo-viewer` | Executable component/package demos. | `defineDemo()`, `render()` and `afterRender()` are core demo authoring APIs. Read the package skill whenever creating/reviewing `*.demo.ts`. |
| `@trunkjs/element-relocator` | Moves/synchronizes navigation items between responsive navigation containers. | `<tj-element-relocator>`; pair with `@trunkjs/responsive` for breakpoint-driven relocation rather than adding breakpoint logic to the relocator. |
| `@trunkjs/form` | Named object-backed forms and form workflow helpers. | `TjForm` / `<tj-form>`, `TjFormRegistry`, `registerFormPreset()`, `EnterNextPlugin`, `enterNextPlugin()`. |
| `@trunkjs/loader` | Shared loader/loading-state coordination. | `<tj-loader>` and loader state API; use when multiple components need a common loading signal. |
| `@trunkjs/markdown-loader` | Loads Markdown content for application/demo pipelines. | Use for fetching/loading Markdown prior to rendering/transformation; inspect its public entrypoint for exact loader options. |
| `@trunkjs/prolit` | Lightweight Lit/proxy-template foundations. | Public exports include Lit environment helpers, `ProLitTemplate`, and `scopeDefine`. |
| `@trunkjs/prolit-elements` | Ready-to-use elements built on ProLit. | Includes `<tj-include>` for fetching HTML fragments; read package usage docs for load modes and additional elements. |
| `@trunkjs/responsive` | Runtime responsive class/style directives and breakpoint state. | `<tj-responsive>` and breakpoint-qualified class syntax; prefer it over handwritten resize listeners or one-off media-query logic when behavior is representable by its directives. |
| `@trunkjs/scope` | Runtime scope and event-scope helpers. | Public entrypoint exports `EventMixin`, scope runtime/types and related helpers. |
| `@trunkjs/scrollspy` | Scroll-position / active-section observation. | Use for synchronizing navigation/active state with document sections; inspect package entrypoint for exact event/options contract. |
| `@trunkjs/vite-demo-viewer` | Vite/Nx/GitHub-Pages integration for demo viewer builds. | `tjDemoViewerPlugin()` and package setup conventions; use its setup skill for package-local or combined documentation builds. |
| `@trunkjs/trunkjs-skill` | Code-free repository API documentation. | This package; primary artifact is `skills/trunkjs-api-skill/SKILL.md`. |

## Decision guide

- Writing Markdown-driven page/layout content: start with `@trunkjs/content-pane`.
- Creating or testing executable component demos: `@trunkjs/demo-viewer`; use `@trunkjs/vite-demo-viewer` only for build/setup integration.
- Implementing responsive class/state behavior: `@trunkjs/responsive`.
- Browser helpers, form-value access, event/listener mixins or storage: `@trunkjs/browser-utils`.
- Building structured forms: `@trunkjs/form`.
- Moving navigation items between responsive containers: `@trunkjs/element-relocator` together with responsive state.
- Shared loading state: `@trunkjs/loader`.
- Markdown acquisition: `@trunkjs/markdown-loader`; Markdown layout/rendering belongs to Content Pane.

## Baseline provenance

Baseline established 2026-09-03 from the current `packages/` inventory, root `AGENTS.md`, package entrypoints, existing `.ai-usage-info.md` files and package-local skills. Update this skill when package inventory, public entrypoints, package skills, architecture contracts, tests, or docs materially change.
